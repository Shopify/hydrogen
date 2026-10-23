import {expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {captureJsonOutput} from '../../../tests/output.js';
import {runBuildWatch} from './build.js';
import {
  buildCommandOutputSchema,
  type BuildWatchRecord,
} from '../../lib/build-tooling/types.js';
import {writeWatchRecord} from '../../lib/watch.js';

it('rebuilds real Vite artifacts after a source error is fixed', async () => {
  await inTemporaryDirectory(async (directory) => {
    await writeFile(
      joinPath(directory, 'vite.config.mjs'),
      `export default ({isSsrBuild}) => ({
      build: {
        outDir: isSsrBuild ? 'dist/server' : 'dist/client',
        ssr: isSsrBuild ? 'server.js' : false,
        rollupOptions: {input: isSsrBuild ? 'server.js' : 'index.html', output: {entryFileNames: 'index.js'}},
      },
    });`,
    );
    await writeFile(
      joinPath(directory, 'index.html'),
      '<script type="module" src="/client.js"></script>',
    );
    await writeFile(joinPath(directory, 'client.js'), 'console.log("client");');
    const serverPath = joinPath(directory, 'server.js');
    await writeFile(
      serverPath,
      'export default {fetch() {return new Response("first");}};',
    );
    const controller = new AbortController();
    const records: BuildWatchRecord[] = [];
    const {stdout} = await captureJsonOutput(async () => {
      const running = runBuildWatch(
        {directory, lockfileCheck: false, bundleStats: false},
        controller.signal,
        (record) => {
          records.push(record);
          writeWatchRecord(buildCommandOutputSchema, record);
        },
      );
      try {
        await vi.waitFor(
          () => expect(records.at(-1)?.type).toBe('build-completed'),
          {timeout: 10000},
        );
        await writeFile(serverPath, 'export default { broken syntax');
        await vi.waitFor(
          () => expect(records.at(-1)?.type).toBe('build-failed'),
          {timeout: 10000},
        );
        await writeFile(
          serverPath,
          'export default {fetch() {return new Response("second");}};',
        );
        await vi.waitFor(
          () => expect(records.at(-1)?.type).toBe('build-completed'),
          {timeout: 10000},
        );
        expect(
          await readFile(joinPath(directory, 'dist/server/index.js')),
        ).toContain('second');
      } finally {
        controller.abort();
        await running;
      }
    });
    expect(
      stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).type),
    ).toEqual([
      'watch-started',
      'build-started',
      'build-completed',
      'build-started',
      'build-failed',
      'build-started',
      'build-completed',
      'watch-stopped',
    ]);
    expect(JSON.parse(stdout.trim().split('\n')[2]!)).toMatchObject({
      serverPath: joinPath(directory, 'dist/server/index.js'),
      clientDirectory: joinPath(directory, 'dist/client'),
    });
  });
}, 30000);
