import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';
import {runDevSession} from '../../lib/dev-session.js';
import {deferPromise} from '../../lib/defer.js';
import {importVite} from '../../lib/import-utils.js';
import {
  findHydrogenPlugin,
  findOxygenPlugin,
  getViteConfig,
} from '../../lib/vite-config.js';
import {
  getDevConfigInBackground,
  startTunnelAndPushConfig,
} from '../../lib/dev-shared.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {getCliCommand} from '../../lib/shell.js';
import {getCodeFormatOptions} from '../../lib/format-code.js';
import {startTunnelPlugin} from '../../lib/tunneling.js';
import {login} from '../../lib/auth.js';
import {abandonOnAbort} from '../../lib/abort.js';
import {runDev} from './dev.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/vite-config.js');
vi.mock('../../lib/dev-shared.js');
vi.mock('../../lib/environment-variables.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../lib/environment-variables.js')
  >()),
  getAllEnvironmentVariables: vi.fn(),
}));
vi.mock('../../lib/shell.js');
vi.mock('../../lib/format-code.js');
vi.mock('../../lib/auth.js');
vi.mock('./link.js');
vi.mock('../../lib/build.js', () => ({hydrogenPackagesPath: undefined}));
vi.mock('../../lib/tunneling.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/tunneling.js')>()),
  startTunnelPlugin: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each(['configuration', 'environment'] as const)(
  'retains ownership through pending %s work when Vite creation fails',
  async (stage) => {
    const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-startup-'));
    const started = deferPromise();
    const pending = deferPromise();
    mockRuntime(vi.fn(), async () => {});
    if (stage === 'configuration') {
      vi.mocked(getDevConfigInBackground).mockImplementationOnce(async () => {
        started.resolve();
        await pending.promise;
        return {
          customerAccountPush: false,
          localVariables: {},
          fetchRemote: false,
        } as any;
      });
    } else {
      vi.mocked(getAllEnvironmentVariables).mockImplementationOnce(async () => {
        started.resolve();
        await pending.promise;
        return {allVariables: {}, logInjectedVariables: vi.fn()} as any;
      });
    }
    vi.mocked(importVite).mockResolvedValue({
      createLogger: () => ({}),
      createServer: async () => {
        await started.promise;
        throw new Error('Invalid Vite configuration');
      },
    } as any);
    const running = runDevSession(
      {command: 'hydrogen dev', directory, envFile: '.env'},
      (session) =>
        runDev({
          path: directory,
          envFile: '.env',
          cliConfig: {} as any,
          session,
        }),
    );
    const settled = running.catch(() => {});
    try {
      await started.promise;
      await expect(
        Promise.race([
          settled.then(() => 'finished'),
          new Promise<string>((resolve) =>
            setTimeout(() => resolve('pending'), 100),
          ),
        ]),
      ).resolves.toBe('pending');
      expect(await listDevInstances(directory)).toHaveLength(1);
      pending.resolve();
      await expect(running).rejects.toThrow('Invalid Vite configuration');
      expect(await listDevInstances(directory)).toHaveLength(0);
    } finally {
      pending.resolve();
      await settled;
      await rm(directory, {recursive: true, force: true});
    }
  },
);

it.each(['listen failure', 'cancellation'])(
  'settles startup during a pending background login on %s',
  async (outcome) => {
    const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-startup-'));
    const controller = new AbortController();
    const loggingIn = deferPromise();
    const authenticated = deferPromise();
    const closeServer = vi.fn();
    mockRuntime(closeServer, async () => {
      await loggingIn.promise;
      if (outcome === 'listen failure') throw new Error('Port unavailable');
    });
    const {getDevConfigInBackground: getConfig} = await vi.importActual<
      typeof import('../../lib/dev-shared.js')
    >('../../lib/dev-shared.js');
    vi.mocked(getDevConfigInBackground).mockImplementation(getConfig);
    vi.mocked(login).mockImplementationOnce(async (_root, _shop, signal) => {
      loggingIn.resolve();
      await abandonOnAbort(() => authenticated.promise, signal);
      return {
        session: {token: 'token', storeFqdn: 'example.myshopify.com'},
        config: {
          shop: 'example.myshopify.com',
          shopName: 'Example',
          email: 'developer@example.com',
        },
      };
    });
    const running = runDevSession(
      {
        command: 'hydrogen dev',
        directory,
        envFile: '.env',
        signal: controller.signal,
      },
      (session) =>
        runDev({
          path: directory,
          envFile: '.env',
          customerAccountPush: true,
          disableVersionCheck: true,
          cliConfig: {} as any,
          session,
        }),
    );
    const settled = running.catch(() => {});
    try {
      await vi.waitFor(() => expect(login).toHaveBeenCalledOnce());
      if (outcome === 'cancellation') controller.abort();
      const completed = vi.fn();
      void settled.then(completed);
      await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
      if (outcome === 'listen failure') {
        await expect(running).rejects.toThrow('Port unavailable');
      } else {
        await expect(running).resolves.toBeUndefined();
      }
      expect(closeServer).toHaveBeenCalledOnce();
      expect(await listDevInstances(directory)).toHaveLength(0);
      expect(startTunnelAndPushConfig).not.toHaveBeenCalled();
    } finally {
      controller.abort();
      loggingIn.resolve();
      authenticated.resolve();
      await settled;
      await rm(directory, {recursive: true, force: true});
    }
  },
);

it('retains ownership through an in-flight tunnel when listening fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-startup-'));
  const controller = new AbortController();
  const tunnelStarted = deferPromise();
  const finishTunnel = deferPromise();
  const closeTunnel = vi.fn();
  const closeServer = vi.fn();
  mockRuntime(closeServer, async () => {
    throw new Error('Port unavailable');
  });
  vi.mocked(startTunnelAndPushConfig).mockImplementation(async () => {
    tunnelStarted.resolve();
    await finishTunnel.promise;
    return {host: 'https://local.tryhydrogen.dev', cleanup: closeTunnel};
  });
  const running = runDevSession(
    {
      command: 'hydrogen dev',
      directory,
      envFile: '.env',
      signal: controller.signal,
    },
    (session) =>
      runDev({
        path: directory,
        envFile: '.env',
        customerAccountPush: true,
        disableVersionCheck: true,
        cliConfig: {} as any,
        session,
      }),
  );
  const settled = running.catch(() => {});
  try {
    await Promise.race([tunnelStarted.promise, running]);
    controller.abort();
    await vi.waitFor(() => expect(closeServer).toHaveBeenCalledTimes(1));
    expect(await listDevInstances(directory)).toHaveLength(1);
    await expect(
      runDevSession(
        {
          command: 'hydrogen dev',
          directory,
          envFile: '.env',
          signal: AbortSignal.abort(),
        },
        async () => {},
      ),
    ).rejects.toMatchObject({code: 'dev_instance_already_running'});
  } finally {
    finishTunnel.resolve();
    await settled;
    await rm(directory, {recursive: true, force: true});
  }
  await expect(running).resolves.toBeUndefined();
  expect(closeTunnel).toHaveBeenCalledTimes(1);
});

it('cancels a pending tunnel when the server fails to listen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-startup-'));
  const controller = new AbortController();
  const polling = deferPromise();
  const closeTunnel = vi.fn();
  const closeServer = vi.fn();
  const {startTunnelAndPushConfig: startTunnel} = await vi.importActual<
    typeof import('../../lib/dev-shared.js')
  >('../../lib/dev-shared.js');
  vi.mocked(startTunnelAndPushConfig).mockImplementation(startTunnel);
  vi.mocked(startTunnelPlugin).mockResolvedValue({
    provider: 'cloudflare',
    port: 3000,
    stopTunnel: closeTunnel,
    getTunnelStatus: () => {
      polling.resolve();
      return {status: 'starting'};
    },
  });
  mockRuntime(closeServer, async () => {
    await polling.promise;
    throw new Error('Port unavailable');
  });
  const running = runDevSession(
    {
      command: 'hydrogen dev',
      directory,
      envFile: '.env',
      signal: controller.signal,
    },
    (session) =>
      runDev({
        path: directory,
        envFile: '.env',
        customerAccountPush: true,
        disableVersionCheck: true,
        cliConfig: {} as any,
        session,
      }),
  );
  const settled = running.catch(() => {});
  try {
    await expect(running).rejects.toThrow('Port unavailable');
    expect(closeTunnel).toHaveBeenCalledTimes(1);
    expect(closeServer).toHaveBeenCalledTimes(1);
    expect(await listDevInstances(directory)).toHaveLength(0);
  } finally {
    controller.abort();
    await settled;
    await rm(directory, {recursive: true, force: true});
  }
});

it('records entry point errors from the runtime plugin with their stack', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-dev-startup-'));
  const registerPluginOptions = vi.fn();
  mockRuntime(vi.fn(), async () => {});
  vi.mocked(findOxygenPlugin).mockReturnValue({
    api: {registerPluginOptions},
  } as any);
  vi.mocked(importVite).mockResolvedValue({
    createLogger: () => ({}),
    createServer: async (config: any) => {
      config.plugins[0].configResolved({});
      await registerPluginOptions.mock.calls[0]![0].entryPointErrorHandler({
        stack: 'Error: Worker startup failed\n    at worker.ts:10:1',
      });
      throw new Error('Stopped after plugin configuration');
    },
  } as any);
  try {
    await expect(
      runDevSession(
        {command: 'hydrogen dev', directory, envFile: '.env'},
        (session) =>
          runDev({
            path: directory,
            envFile: '.env',
            cliConfig: {} as any,
            session,
          }),
      ),
    ).rejects.toThrow('Stopped after plugin configuration');
    const folder = join(directory, '.shopify', 'dev');
    const files = await readdir(folder);
    const records = (await readFile(join(folder, files[0]!), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: 'Error: Worker startup failed\n    at worker.ts:10:1',
      }),
    );
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

function mockRuntime(closeServer: () => void, listen: () => Promise<void>) {
  vi.mocked(importVite).mockResolvedValue({
    createLogger: () => ({}),
    createServer: async () => ({
      config: {server: {}},
      watcher: {on: vi.fn()},
      ws: {on: vi.fn()},
      close: closeServer,
      listen,
    }),
  } as any);
  vi.mocked(findHydrogenPlugin).mockReturnValue({} as any);
  vi.mocked(getViteConfig).mockResolvedValue({remixConfig: {}} as any);
  vi.mocked(getDevConfigInBackground).mockResolvedValue({
    customerAccountPush: true,
    localVariables: {},
    fetchRemote: false,
  } as any);
  vi.mocked(getAllEnvironmentVariables).mockResolvedValue({
    allVariables: {},
    logInjectedVariables: vi.fn(),
  } as any);
  vi.mocked(getCliCommand).mockResolvedValue('pnpm shopify hydrogen');
  vi.mocked(getCodeFormatOptions).mockResolvedValue({} as any);
}
