import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {deferPromise} from '../../lib/defer.js';
import {importVite} from '../../lib/import-utils.js';
import {getViteConfig} from '../../lib/vite-config.js';
import {runBuild} from './build.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/vite-config.js');

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function withBuildFixture(
  run: (fixture: {
    directory: string;
    build: ReturnType<typeof vi.fn>;
    clientWatcher: {close: ReturnType<typeof vi.fn>};
    serverWatcher: {close: ReturnType<typeof vi.fn>};
    plugins: Array<{
      buildStart: () => void | Promise<void>;
      writeBundle: () => void | Promise<void>;
    }>;
  }) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'hydrogen-build-runtime-'));
  vi.stubEnv('NODE_ENV', 'development');
  const clientWatcher = {close: vi.fn(async () => {})};
  const serverWatcher = {close: vi.fn(async () => {})};
  const plugins: Array<{
    buildStart: () => void | Promise<void>;
    writeBundle: () => void | Promise<void>;
  }> = [];
  const build = vi.fn(async (config) => {
    const plugin = config.plugins[0];
    plugins.push(plugin);
    await plugin.buildStart();
    await plugin.writeBundle();
    return plugins.length === 1 ? clientWatcher : serverWatcher;
  });
  vi.mocked(importVite).mockResolvedValue({
    createLogger: () => ({}),
    build,
  } as any);
  vi.mocked(getViteConfig).mockResolvedValue({
    userViteConfig: {},
    remixConfig: {appDirectory: join(directory, 'app')},
    clientOutDir: join(directory, 'dist/client'),
    serverOutDir: join(directory, 'dist/server'),
    serverOutFile: join(directory, 'dist/server/index.js'),
  } as any);
  try {
    await run({directory, build, clientWatcher, serverWatcher, plugins});
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

it('closes both watchers and cancels pending rebuilds through session cleanup', async () => {
  await withBuildFixture(
    async ({directory, clientWatcher, serverWatcher, plugins}) => {
      const cleanups: Array<() => Promise<unknown>> = [];
      const result = await runBuild({
        directory,
        watch: true,
        lockfileCheck: false,
        bundleStats: false,
        registerCleanup: (close) => cleanups.push(close),
      });
      const [client, server] = plugins;
      await client!.buildStart();
      const rebuildFinished = vi.fn();
      const rebuilding = Promise.resolve(server!.buildStart()).then(
        rebuildFinished,
        rebuildFinished,
      );
      clientWatcher.close.mockImplementation(async () => {
        await rebuilding;
      });
      serverWatcher.close.mockImplementation(async () => {
        await rebuilding;
      });
      const cleanup = (async () => {
        for (const close of cleanups.reverse()) await close();
      })();
      try {
        await vi.waitFor(() => {
          expect(clientWatcher.close).toHaveBeenCalledTimes(1);
          expect(serverWatcher.close).toHaveBeenCalledTimes(1);
          expect(rebuildFinished).toHaveBeenCalledTimes(1);
        });
        await cleanup;
        await result.close();
        expect(clientWatcher.close).toHaveBeenCalledTimes(1);
        expect(serverWatcher.close).toHaveBeenCalledTimes(1);
      } finally {
        await client!.writeBundle();
        await rebuilding;
        await cleanup;
      }
    },
  );
});

it('closes the client watcher if starting the server build fails', async () => {
  await withBuildFixture(async ({directory, build, clientWatcher}) => {
    const cleanups: Array<() => Promise<unknown>> = [];
    const error = new Error('Server build could not start');
    build.mockImplementationOnce(build.getMockImplementation()!);
    build.mockRejectedValueOnce(error);
    await expect(
      runBuild({
        directory,
        watch: true,
        lockfileCheck: false,
        bundleStats: false,
        registerCleanup: (close) => cleanups.push(close),
      }),
    ).rejects.toBe(error);
    for (const close of cleanups.reverse()) await close();
    expect(clientWatcher.close).toHaveBeenCalledTimes(1);
  });
});

it('closes a watcher acquired after session shutdown has started', async () => {
  await withBuildFixture(
    async ({directory, build, clientWatcher, serverWatcher}) => {
      const controller = new AbortController();
      const serverBuildStarted = deferPromise();
      const continueServerBuild = deferPromise();
      const buildImplementation = build.getMockImplementation()!;
      build.mockImplementationOnce(buildImplementation);
      build.mockImplementationOnce(async (config) => {
        serverBuildStarted.resolve();
        await continueServerBuild.promise;
        return buildImplementation(config);
      });
      const cleanups: Array<() => Promise<unknown>> = [];
      const lateCleanups: Array<Promise<unknown>> = [];
      const building = runBuild({
        directory,
        watch: true,
        lockfileCheck: false,
        bundleStats: false,
        signal: controller.signal,
        registerCleanup(close) {
          if (controller.signal.aborted) lateCleanups.push(close());
          else cleanups.push(close);
        },
      });
      const reason = new Error('Preview stopped');
      const stopped = expect(building).rejects.toBe(reason);
      await serverBuildStarted.promise;
      controller.abort(reason);
      for (const close of cleanups.reverse()) await close();
      continueServerBuild.resolve();
      await stopped;
      await Promise.all(lateCleanups);
      expect(clientWatcher.close).toHaveBeenCalledTimes(1);
      expect(serverWatcher.close).toHaveBeenCalledTimes(1);
    },
  );
});
