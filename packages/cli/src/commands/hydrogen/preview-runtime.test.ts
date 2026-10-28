import {Console} from 'node:console';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {withCapturedStandardStreams} from '@shopify/cli-kit/node/testing/output';
import {resetAllLogs} from '../../lib/log.js';
import {runDevSession} from '../../lib/dev-session.js';
import {getProjectPaths, isClassicProject} from '../../lib/remix-config.js';
import {getViteConfig} from '../../lib/vite-config.js';
import {getConfig} from '../../lib/shopify-config.js';
import {getAllEnvironmentVariables} from '../../lib/environment-variables.js';
import {findPort} from '../../lib/find-port.js';
import {startMiniOxygen} from '../../lib/mini-oxygen/index.js';
import {runBuild} from './build.js';
import type {BuildResult} from '../../lib/build-tooling/types.js';
import {runPreview} from './preview.js';
import {deferPromise} from '../../lib/defer.js';
import {abandonOnAbort} from '../../lib/abort.js';
import {listDevInstances} from '@shopify/cli-kit/node/dev-instance';

vi.mock('../../lib/remix-config.js');
vi.mock('../../lib/vite-config.js');
vi.mock('../../lib/shopify-config.js');
vi.mock('../../lib/environment-variables.js');
vi.mock('../../lib/find-port.js');
vi.mock('../../lib/mini-oxygen/index.js');
vi.mock('./build.js');
vi.mock('../../lib/log.js', async (original) => ({
  ...(await original<typeof import('../../lib/log.js')>()),
  setH2OVerbose: vi.fn(),
}));

afterEach(() => {
  resetAllLogs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function withPreviewFixture(
  run: (fixture: {
    directory: string;
    buildResult: BuildResult;
    controller: AbortController;
    runtime: {
      listeningAt: string;
      close: ReturnType<typeof vi.fn>;
      reload: ReturnType<typeof vi.fn>;
      showBanner: ReturnType<typeof vi.fn>;
    };
  }) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-preview-'));
  vi.stubGlobal(
    'console',
    new Console({stdout: process.stdout, stderr: process.stderr}),
  );
  const runtime = {
    listeningAt: 'http://localhost:3000',
    close: vi.fn(),
    reload: vi.fn(),
    showBanner: vi.fn(),
  };
  vi.mocked(getProjectPaths).mockReturnValue({
    root: directory,
    buildPath: join(directory, 'dist'),
    buildPathWorkerFile: join(directory, 'dist/server/index.js'),
    buildPathClient: join(directory, 'dist/client'),
  } as any);
  vi.mocked(isClassicProject).mockResolvedValue(false);
  vi.mocked(getViteConfig).mockResolvedValue({} as any);
  vi.mocked(getConfig).mockResolvedValue({} as any);
  vi.mocked(getAllEnvironmentVariables).mockResolvedValue({
    allVariables: {},
    logInjectedVariables: vi.fn(),
  } as any);
  vi.mocked(findPort).mockResolvedValue(3000);
  vi.mocked(startMiniOxygen).mockImplementation(async (options) => {
    options.registerCleanup?.(runtime.close);
    return runtime as any;
  });
  try {
    await run({
      directory,
      runtime,
      controller: new AbortController(),
      buildResult: {
        directory,
        clientDirectory: join(directory, 'dist/client'),
        serverDirectory: join(directory, 'dist/server'),
        serverPath: join(directory, 'dist/server/index.js'),
      },
    });
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

it.each([false, true])(
  'records readiness and repeated preview rebuilds while preserving build options (JSON: %s)',
  async (json) => {
    await withPreviewFixture(
      async ({directory, controller, runtime, buildResult}) => {
        let buildOptions: Parameters<typeof runBuild>[0];
        const closeBuild = vi.fn();
        vi.mocked(runBuild).mockImplementation(async (options) => {
          buildOptions = options;
          options.registerCleanup?.(closeBuild);
          await options.onServerBuildStart?.();
          await options.onServerBuildFinish?.(1, buildResult);
          return {close: closeBuild, result: buildResult};
        });
        const output = await withCapturedStandardStreams(async (streams) => {
          await runDevSession(
            {
              command: 'hydrogen preview',
              json,
              directory,
              envFile: '.env',
              watch: true,
              signal: controller.signal,
            },
            async (session) => {
              await runPreview({
                directory,
                envFile: '.env',
                debug: false,
                build: true,
                watch: true,
                codegen: true,
                entry: 'server.ts',
                session,
              });
              const runtimeOptions = vi
                .mocked(startMiniOxygen)
                .mock.calls.at(-1)![0];
              runtimeOptions.logRequestLine?.({
                request: {
                  url: 'http://localhost:3000/products?view=all',
                  method: 'GET',
                  headers: {},
                },
                response: {status: 200, statusText: 'OK', headers: {}},
                meta: {startTimeMs: 0, endTimeMs: 5, durationMs: 5},
              });
              console.error('Recoverable preview failure');
              buildOptions.onCodegenOutput?.('Types generated', 'info');
              await buildOptions.onServerBuildFinish?.(2, buildResult);
              await buildOptions.onServerBuildFinish?.(3, buildResult);
              console.log('Repeated worker message');
              console.log('Repeated worker message');
              for (const method of ['GET', 'POST']) {
                runtimeOptions.logRequestLine?.({
                  request: {
                    url: 'http://localhost:3000/products?view=all&_data=routes/products',
                    method,
                    headers: {},
                  },
                  response: {status: 200, statusText: 'OK', headers: {}},
                  meta: {startTimeMs: 0, endTimeMs: 5, durationMs: 5},
                });
              }
              controller.abort();
            },
          );
          return {stdout: streams.stdout(), stderr: streams.stderr()};
        });
        expect(runtime.reload).toHaveBeenCalledTimes(2);
        if (json) expect(runtime.showBanner).not.toHaveBeenCalled();
        else
          expect(runtime.showBanner).toHaveBeenCalledWith({
            mode: 'preview',
            headlinePrefix: 'Watching for changes. ',
          });
        expect(runtime.close).toHaveBeenCalledTimes(1);
        expect(closeBuild).toHaveBeenCalledTimes(1);
        expect(runBuild).toHaveBeenCalledWith(
          expect.objectContaining({
            json,
            watch: true,
            useCodegen: true,
            entry: 'server.ts',
          }),
        );
        const folder = join(directory, '.shopify', 'dev');
        const files = await readdir(folder);
        expect(files).toHaveLength(1);
        const log = await readFile(join(folder, files[0]!), 'utf8');
        if (json) expect(output.stdout).toBe(log);
        const records = log
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line));
        expect(
          records.filter(({message}) => message === 'Runtime reloaded'),
        ).toHaveLength(2);
        expect(records).toContainEqual(
          expect.objectContaining({
            message: 'Ready: http://localhost:3000',
            source: 'hydrogen preview',
          }),
        );
        expect(
          records.filter(({message}) =>
            message.includes('/products?view=all '),
          ),
        ).toHaveLength(1);
        expect(records).toContainEqual(
          expect.objectContaining({
            level: 'error',
            message: 'Recoverable preview failure',
          }),
        );
        expect(records).toContainEqual(
          expect.objectContaining({message: 'Types generated'}),
        );
        if (json) {
          expect(output.stderr).toBe('');
          expect(
            records.filter(
              ({message}) => message === 'Project rebuilt. Reloading server',
            ),
          ).toHaveLength(2);
          expect(
            records.filter(
              ({message}) => message === 'Repeated worker message',
            ),
          ).toHaveLength(2);
          expect(
            records.filter(({message}) =>
              message.includes('/products?view=all&_data=routes/products'),
            ),
          ).toHaveLength(2);
        }
      },
    );
  },
);

it('releases an initial build watcher when preview startup fails', async () => {
  await withPreviewFixture(async ({directory, controller, runtime}) => {
    const closeBuild = vi.fn();
    const error = new Error('Initial build failed');
    vi.mocked(runBuild).mockImplementation(async (options) => {
      options.registerCleanup?.(closeBuild);
      throw error;
    });
    await expect(
      runDevSession(
        {
          command: 'hydrogen preview',
          directory,
          envFile: '.env',
          signal: controller.signal,
        },
        (session) =>
          runPreview({
            directory,
            envFile: '.env',
            debug: false,
            build: true,
            watch: true,
            session,
          }),
      ),
    ).rejects.toBe(error);
    expect(closeBuild).toHaveBeenCalledTimes(1);
    expect(runtime.close).not.toHaveBeenCalled();
  });
});

it('cancels pending environment authentication before starting the preview runtime', async () => {
  await withPreviewFixture(async ({directory, controller}) => {
    const started = deferPromise();
    const pending = deferPromise();
    vi.mocked(getAllEnvironmentVariables).mockImplementationOnce(
      async ({signal}) => {
        started.resolve();
        await abandonOnAbort(() => pending.promise, signal);
        return {allVariables: {}, logInjectedVariables: vi.fn()} as any;
      },
    );
    const running = runDevSession(
      {
        command: 'hydrogen preview',
        directory,
        envFile: '.env',
        signal: controller.signal,
      },
      (session) =>
        runPreview({
          directory,
          envFile: '.env',
          debug: false,
          build: false,
          session,
        }),
    );
    const settled = running.catch(() => {});
    try {
      await started.promise;
      controller.abort();
      const completed = vi.fn();
      void settled.then(completed);
      await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
      await expect(running).resolves.toBeUndefined();
      expect(startMiniOxygen).not.toHaveBeenCalled();
      expect(await listDevInstances(directory)).toHaveLength(0);
    } finally {
      controller.abort();
      pending.resolve();
      await settled;
    }
  });
});

it('stops preview while the initial watched build has not completed', async () => {
  await withPreviewFixture(
    async ({directory, controller, runtime, buildResult}) => {
      const closeBuild = vi.fn();
      let buildOptions: Parameters<typeof runBuild>[0];
      const assetsPortFound = deferPromise();
      vi.mocked(runBuild).mockImplementation(async (options) => {
        buildOptions = options;
        options.registerCleanup?.(closeBuild);
        return {close: closeBuild, result: buildResult};
      });
      vi.mocked(findPort).mockImplementation(async (port) => {
        if (port === 3100) assetsPortFound.resolve();
        return port ?? 3000;
      });
      const stopped = vi.fn();
      const running = runDevSession(
        {
          command: 'hydrogen preview',
          directory,
          envFile: '.env',
          signal: controller.signal,
        },
        (session) =>
          runPreview({
            directory,
            envFile: '.env',
            debug: false,
            build: true,
            watch: true,
            session,
          }),
      ).then(stopped);
      try {
        await assetsPortFound.promise;
        controller.abort();
        await vi.waitFor(() => expect(stopped).toHaveBeenCalledTimes(1));
        expect(closeBuild).toHaveBeenCalledTimes(1);
        expect(startMiniOxygen).not.toHaveBeenCalled();
        expect(runtime.close).not.toHaveBeenCalled();
      } finally {
        await Promise.resolve()
          .then(() => buildOptions.onServerBuildFinish?.(1, buildResult))
          .catch(() => {});
        await running;
      }
    },
  );
});
