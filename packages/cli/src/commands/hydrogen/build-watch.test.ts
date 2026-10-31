import {afterEach, expect, it, vi} from 'vitest';
import {fileExists, inTemporaryDirectory} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {handler, AbortError} from '@shopify/cli-kit/node/error';
import {captureJsonOutput} from '../../../tests/output.js';
import {importVite} from '../../lib/import-utils.js';
import {getViteConfig, isViteProject} from '../../lib/vite-config.js';
import {writeWatchRecord} from '../../lib/watch.js';
import * as watch from '../../lib/watch.js';
import {buildCommandOutputSchema} from '../../lib/build-tooling/types.js';
import Build, {runBuildWatch} from './build.js';

vi.mock('../../lib/import-utils.js');
vi.mock('../../lib/vite-config.js');
afterEach(() => vi.restoreAllMocks());

it('writes JSON lifecycle records through the command and closes both watchers', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {closeClient, closeServer} = mockBuilds(directory);
    vi.mocked(isViteProject).mockResolvedValue(true);
    vi.spyOn(watch, 'runWatchCommand').mockImplementationOnce((run) =>
      run(AbortSignal.abort()),
    );
    const command = new Build(['--json', '--watch'], {} as any);
    vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {
        json: true,
        watch: true,
        path: directory,
        'lockfile-check': false,
      },
    });
    const {stdout} = await captureJsonOutput(() => command.run());
    expect(
      stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([{type: 'watch-started', directory}, {type: 'watch-stopped'}]);
    expect(closeClient).toHaveBeenCalledOnce();
    expect(closeServer).toHaveBeenCalledOnce();
  });
});

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

it('closes both watchers and removes the client rebuild trigger on a normal stop', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {build, closeClient, closeServer} = mockBuilds(directory);
    const addWatchFile = vi.fn();
    build.mockImplementationOnce(async (config) => {
      const client = config.plugins.find(
        (plugin: {name: string}) => plugin.name === 'hydrogen:cli:client',
      );
      client.buildStart();
      await client.writeBundle();
      return {close: closeClient};
    });
    build.mockImplementationOnce(async (config) => {
      const server = {
        ...config.plugins.find(
          (plugin: {name: string}) => plugin.name === 'hydrogen:cli:server',
        ),
        addWatchFile,
      };
      await server.buildStart();
      await server.writeBundle();
      return {close: closeServer};
    });
    const controller = new AbortController();
    const running = runBuildWatch(
      {directory, lockfileCheck: false},
      controller.signal,
      () => {},
    );
    try {
      await vi.waitFor(() => expect(addWatchFile).toHaveBeenCalledOnce());
      expect(await fileExists(addWatchFile.mock.calls[0]![0])).toBe(true);
    } finally {
      controller.abort();
      await running;
    }
    expect(closeClient).toHaveBeenCalledOnce();
    expect(closeServer).toHaveBeenCalledOnce();
    expect(await fileExists(addWatchFile.mock.calls[0]![0])).toBe(false);
  });
});

it('removes the client rebuild trigger when server setup fails', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {build, closeClient} = mockBuilds(directory);
    const addWatchFile = vi.fn();
    build.mockImplementationOnce(async (config) => {
      const client = config.plugins.find(
        (plugin: {name: string}) => plugin.name === 'hydrogen:cli:client',
      );
      client.buildStart();
      await client.writeBundle();
      return {close: closeClient};
    });
    build.mockImplementationOnce(async (config) => {
      const server = {
        ...config.plugins.find(
          (plugin: {name: string}) => plugin.name === 'hydrogen:cli:server',
        ),
        addWatchFile,
      };
      await server.buildStart();
      expect(await fileExists(addWatchFile.mock.calls[0]![0])).toBe(true);
      throw new Error('Invalid server configuration');
    });
    await expect(
      runBuildWatch(
        {directory, lockfileCheck: false},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow('Invalid server configuration');
    expect(closeClient).toHaveBeenCalledOnce();
    expect(await fileExists(addWatchFile.mock.calls[0]![0])).toBe(false);
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
