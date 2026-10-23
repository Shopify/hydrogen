import {afterEach, expect, it, vi} from 'vitest';
import {inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {handler, AbortError} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import {importVite} from '../../lib/import-utils.js';
import {getViteConfig} from '../../lib/vite-config.js';
import {writeWatchRecord} from '../../lib/watch.js';
import {buildCommandOutputSchema} from '../../lib/build-tooling/types.js';
import {runBuildWatch} from './build.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/vite-config.js');
afterEach(() => vi.restoreAllMocks());

function mockBuilds(directory: string) {
  const builds: any[] = [];
  const closeClient = vi.fn(async () => {});
  const closeServer = vi.fn(async () => {});
  vi.mocked(getViteConfig).mockResolvedValue({
    userViteConfig: {},
    remixConfig: {appDirectory: joinPath(directory, 'app')},
    clientOutDir: joinPath(directory, 'dist/client'),
    serverOutDir: joinPath(directory, 'dist/server'),
    serverOutFile: joinPath(directory, 'dist/server/index.js'),
  } as any);
  const build = vi.fn(async (config) => {
    builds.push(config);
    return {close: builds.length === 1 ? closeClient : closeServer};
  });
  vi.mocked(importVite).mockResolvedValue({
    createLogger: () => ({}),
    build,
  } as any);
  return {builds, build, closeClient, closeServer};
}

it('streams rebuilds and recoverable client/server failures, then closes both watchers', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {builds, closeClient, closeServer} = mockBuilds(directory);
    const controller = new AbortController();
    const {stdout, stderr} = await captureJsonOutput(async () => {
      const running = runBuildWatch(
        {directory, lockfileCheck: false, bundleStats: false},
        controller.signal,
        (record) => writeWatchRecord(buildCommandOutputSchema, record),
      );
      try {
        await vi.waitFor(() => expect(builds).toHaveLength(2));
        const client = builds[0].plugins[0];
        const server = builds[1].plugins[0];
        client.buildStart();
        client.writeBundle();
        await server.buildStart();
        await server.writeBundle();
        builds[1].customLogger.warn('Build warning');
        client.buildStart();
        client.buildEnd(new Error('Invalid client source'));
        await expect(server.buildStart()).rejects.toThrow(
          'Invalid client source',
        );
        client.buildStart();
        client.writeBundle();
        await server.buildStart();
        server.buildEnd(new Error('Invalid server source'));
        client.buildStart();
        client.writeBundle();
        await server.buildStart();
        await server.writeBundle();
      } finally {
        controller.abort();
        await running;
      }
    });
    const records = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.map(({type}) => type)).toEqual([
      'watch-started',
      'build-started',
      'build-completed',
      'build-started',
      'build-failed',
      'build-started',
      'build-failed',
      'build-started',
      'build-completed',
      'watch-stopped',
    ]);
    expect(records[2]).toEqual({
      type: 'build-completed',
      cycle: 1,
      directory,
      clientDirectory: joinPath(directory, 'dist/client'),
      serverDirectory: joinPath(directory, 'dist/server'),
      serverPath: joinPath(directory, 'dist/server/index.js'),
    });
    expect(JSON.parse(stderr)).toMatchObject({
      type: 'diagnostic',
      message: 'Build warning',
    });
    expect(closeClient).toHaveBeenCalledOnce();
    expect(closeServer).toHaveBeenCalledOnce();
  });
});

it('closes an allocated client watcher when server setup fails and preserves fatal JSON framing', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {build, closeClient} = mockBuilds(directory);
    build.mockImplementationOnce(async () => ({close: closeClient}));
    build.mockRejectedValueOnce(new AbortError('Invalid server configuration'));
    const {stdout} = await captureJsonOutput(async () => {
      try {
        await runBuildWatch(
          {directory, lockfileCheck: false},
          new AbortController().signal,
          (record) => writeWatchRecord(buildCommandOutputSchema, record),
        );
      } catch (error) {
        await handler(error);
      }
    });
    expect(
      stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([
      {type: 'watch-started', directory},
      {error: {type: 'abort', message: 'Invalid server configuration'}},
    ]);
    expect(closeClient).toHaveBeenCalledOnce();
  });
});
