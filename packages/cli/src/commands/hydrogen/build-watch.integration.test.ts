import {expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  readFile,
  writeFile,
  writeFileSync,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {captureJsonOutput} from '../../../tests/output.js';
import {runBuild, runBuildWatch} from './build.js';
import {
  buildCommandOutputSchema,
  type BuildWatchRecord,
} from '../../lib/build-tooling/types.js';
import {writeWatchRecord} from '../../lib/watch.js';

async function writeBuildFixture(
  directory: string,
  clientSource = 'console.log("client");',
  clientPlugin = '',
  serverPlugin = '',
) {
  await writeFile(
    joinPath(directory, 'vite.config.mjs'),
    `import {readFileSync, writeFileSync} from 'node:fs';
    import {fileURLToPath} from 'node:url';
    export default ({isSsrBuild}) => ({
      plugins: isSsrBuild ? [${serverPlugin}] : [${clientPlugin}],
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
  const clientPath = joinPath(directory, 'client.js');
  await writeFile(clientPath, clientSource);
  const serverPath = joinPath(directory, 'server.js');
  await writeFile(
    serverPath,
    'export default {fetch() {return new Response("first");}};',
  );
  return {clientPath, serverPath};
}

async function editUntilBuildStarts(
  records: BuildWatchRecord[],
  path: string,
  source: string,
) {
  const previousCycle = records.reduce(
    (cycle, record) => (record.type === 'build-started' ? record.cycle : cycle),
    0,
  );
  const started = () =>
    records.some(
      (record) =>
        record.type === 'build-started' && record.cycle > previousCycle,
    );
  await vi.waitFor(
    () => {
      // Keep truncation and writing in one turn so Vite cannot read a partial edit.
      if (!started()) writeFileSync(path, source);
      expect(started()).toBe(true);
    },
    {timeout: 10000, interval: 250},
  );
  return previousCycle;
}

function expectBuildCycles(records: BuildWatchRecord[], minimumCycles: number) {
  expect(records[0]?.type).toBe('watch-started');
  expect(records.at(-1)).toEqual({type: 'watch-stopped'});
  const cycles = records.slice(1, -1);
  expect(cycles.length).toBeGreaterThanOrEqual(minimumCycles * 2);
  expect(cycles.length % 2).toBe(0);
  // Filesystem backends can report the same edit more than once.
  for (let index = 0; index < cycles.length; index += 2) {
    expect(cycles[index]).toEqual({
      type: 'build-started',
      cycle: index / 2 + 1,
    });
    expect(cycles[index + 1]).toMatchObject({
      type: expect.stringMatching(/^build-(completed|failed)$/),
      cycle: index / 2 + 1,
    });
  }
}

it.each([false, true])(
  'keeps client-only preview edits from rebuilding the server with JSON: %s',
  async (json) => {
    await inTemporaryDirectory(async (directory) => {
      const {clientPath} = await writeBuildFixture(directory);
      const serverBuildFinished = vi.fn();
      await captureJsonOutput(async () => {
        const build = await runBuild({
          directory,
          json,
          watch: true,
          lockfileCheck: false,
          bundleStats: false,
          onServerBuildFinish: serverBuildFinished,
        });
        try {
          await vi.waitFor(
            () => expect(serverBuildFinished).toHaveBeenCalledTimes(1),
            {timeout: 10000},
          );
          await writeFile(clientPath, 'console.log("client changed");');
          await vi.waitFor(
            async () =>
              expect(
                await readFile(joinPath(directory, 'dist/client/index.js')),
              ).toContain('client changed'),
            {timeout: 10000},
          );
          // The server watcher delays rebuilds by 100 ms after file changes.
          await new Promise((resolve) => setTimeout(resolve, 500));
          expect(serverBuildFinished).toHaveBeenCalledTimes(1);
        } finally {
          await build.close();
        }
      });
    });
  },
  30000,
);

it('completes client-only rebuilds and recovers after a server source error', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {clientPath, serverPath} = await writeBuildFixture(
      directory,
      undefined,
      '',
      `{
      name: 'capture-client-trigger',
      watchChange(id) {
        if (id.includes('hydrogen-client-build-')) {
          writeFileSync(new URL('./trigger-path.txt', import.meta.url), id);
        }
      },
    }`,
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
        for (const version of [2, 3]) {
          const previousCycle = await editUntilBuildStarts(
            records,
            clientPath,
            `console.log("client ${version}");`,
          );
          await vi.waitFor(
            async () => {
              const record = records.at(-1);
              expect(record).toMatchObject({type: 'build-completed'});
              expect(
                record && 'cycle' in record ? record.cycle : 0,
              ).toBeGreaterThan(previousCycle);
              expect(
                await readFile(joinPath(directory, 'dist/client/index.js')),
              ).toContain(`client ${version}`);
            },
            {timeout: 10000},
          );
        }
        const triggerPath = await readFile(
          joinPath(directory, 'trigger-path.txt'),
        );
        const completedRecords = records.length;
        for (const value of ['duplicate event', 'another duplicate event']) {
          await writeFile(triggerPath, value);
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        expect(records).toHaveLength(completedRecords);
        await editUntilBuildStarts(
          records,
          serverPath,
          'export default { broken syntax',
        );
        await vi.waitFor(
          () => expect(records.at(-1)?.type).toBe('build-failed'),
          {timeout: 10000},
        );
        await editUntilBuildStarts(
          records,
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
    ).toEqual(records.map(({type}) => type));
    expectBuildCycles(records, 5);
    expect(JSON.parse(stdout.trim().split('\n')[2]!)).toMatchObject({
      serverPath: joinPath(directory, 'dist/server/index.js'),
      clientDirectory: joinPath(directory, 'dist/client'),
    });
  });
}, 30000);

it.each(['console.log("first");', 'broken syntax'])(
  'watches plugin-only client inputs and recovers from errors with initial source %s',
  async (initialSource) => {
    await inTemporaryDirectory(async (directory) => {
      await writeBuildFixture(
        directory,
        'import "virtual:client-content";',
        `{
          name: 'client-content',
          resolveId(id) {
            if (id === 'virtual:client-content') return '\\0client-content';
          },
          load(id) {
            if (id !== '\\0client-content') return;
            const path = fileURLToPath(new URL('./client-content.txt', import.meta.url));
            this.addWatchFile(path);
            return readFileSync(path, 'utf8');
          },
        }`,
      );
      const contentPath = joinPath(directory, 'client-content.txt');
      await writeFile(contentPath, initialSource);
      const controller = new AbortController();
      const records: BuildWatchRecord[] = [];
      await captureJsonOutput(async () => {
        const running = runBuildWatch(
          {directory, lockfileCheck: false, bundleStats: false},
          controller.signal,
          (record) => records.push(record),
        );
        try {
          await vi.waitFor(
            () =>
              expect(records.at(-1)?.type).toBe(
                initialSource === 'broken syntax'
                  ? 'build-failed'
                  : 'build-completed',
              ),
            {timeout: 10000},
          );
          for (const [source, expectedOutput] of [
            ['console.log("second");', 'second'],
            ['broken syntax', undefined],
            ['console.log("recovered");', 'recovered'],
          ] as const) {
            const previousCycle = await editUntilBuildStarts(
              records,
              contentPath,
              source,
            );
            await vi.waitFor(
              async () => {
                const record = records.at(-1);
                expect(record).toMatchObject({
                  type:
                    source === 'broken syntax'
                      ? 'build-failed'
                      : 'build-completed',
                });
                expect(
                  record && 'cycle' in record ? record.cycle : 0,
                ).toBeGreaterThan(previousCycle);
                if (expectedOutput) {
                  expect(
                    await readFile(joinPath(directory, 'dist/client/index.js')),
                  ).toContain(expectedOutput);
                }
              },
              {timeout: 10000},
            );
          }
          expect(
            await readFile(joinPath(directory, 'dist/client/index.js')),
          ).toContain('recovered');
        } finally {
          controller.abort();
          await running;
        }
      });
      expect(records[0]).toEqual({type: 'watch-started', directory});
      expectBuildCycles(records, 4);
    });
  },
  30000,
);

it('recovers from an initial client error and watches client-only changes', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {clientPath} = await writeBuildFixture(directory, 'broken syntax');
    const controller = new AbortController();
    const records: BuildWatchRecord[] = [];
    await captureJsonOutput(async () => {
      const running = runBuildWatch(
        {directory, lockfileCheck: false, bundleStats: false},
        controller.signal,
        (record) => records.push(record),
      );
      try {
        await vi.waitFor(
          () => expect(records.at(-1)?.type).toBe('build-failed'),
          {timeout: 10000},
        );
        for (const version of [2, 3]) {
          const previousCycle = await editUntilBuildStarts(
            records,
            clientPath,
            `console.log("recovered ${version}");`,
          );
          await vi.waitFor(
            async () => {
              const record = records.at(-1);
              expect(record).toMatchObject({type: 'build-completed'});
              expect(
                record && 'cycle' in record ? record.cycle : 0,
              ).toBeGreaterThan(previousCycle);
              expect(
                await readFile(joinPath(directory, 'dist/client/index.js')),
              ).toContain(`recovered ${version}`);
            },
            {timeout: 10000},
          );
        }
      } finally {
        controller.abort();
        await running;
      }
    });
    expectBuildCycles(records, 3);
  });
}, 30000);
