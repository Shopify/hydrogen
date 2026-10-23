import {expect, it} from 'vitest';
import {build} from 'esbuild';
import {execFile} from 'node:child_process';
import {symlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  inTemporaryDirectory,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';

it('profiles real rebuilds, recovers from evaluation errors, and exits cleanly on SIGINT', async () => {
  await inTemporaryDirectory(async (directory) => {
    const cliDirectory = fileURLToPath(
      new URL('../../../../', import.meta.url),
    );
    await symlink(
      joinPath(cliDirectory, 'node_modules'),
      joinPath(directory, 'node_modules'),
      'junction',
    );
    const sourceDirectory = joinPath(cliDirectory, 'src');
    await build({
      stdin: {
        contents: `
          export {runDebugCpu, default as Cpu} from ${JSON.stringify(joinPath(sourceDirectory, 'commands/hydrogen/debug/cpu.ts'))};
          export {runWatchCommand, writeWatchRecord} from ${JSON.stringify(joinPath(sourceDirectory, 'lib/watch.ts'))};
          export {withJsonConsole} from ${JSON.stringify(joinPath(sourceDirectory, 'lib/json-output.ts'))};
        `,
        resolveDir: cliDirectory,
      },
      outfile: joinPath(directory, 'runtime.mjs'),
      bundle: true,
      packages: 'external',
      platform: 'node',
      format: 'esm',
    });
    await writeFile(
      joinPath(directory, 'vite.config.mjs'),
      `export default ({isSsrBuild}) => ({
      build: {outDir: isSsrBuild ? 'dist/server' : 'dist/client', ssr: isSsrBuild ? 'server.js' : false,
        rollupOptions: {input: isSsrBuild ? 'server.js' : 'index.html', output: {entryFileNames: 'index.js'}}},
    });`,
    );
    await writeFile(
      joinPath(directory, 'index.html'),
      '<script type="module" src="/client.js"></script>',
    );
    await writeFile(joinPath(directory, 'client.js'), 'console.log("client");');
    await writeFile(
      joinPath(directory, 'server.js'),
      'console.log("Worker startup"); export default {};',
    );
    await writeFile(
      joinPath(directory, 'runner.mjs'),
      `
      import assert from 'node:assert/strict';
      import {readFileSync, writeFileSync} from 'node:fs';
      import {runWithCommandEventsForCommand} from '@shopify/cli-kit/node/command-events';
      import {runDebugCpu, Cpu, runWatchCommand, writeWatchRecord, withJsonConsole} from './runtime.mjs';
      const directory = ${JSON.stringify(directory)};
      const output = directory + '/startup.cpuprofile';
      let successes = 0;
      let previousProfile;
      await runWithCommandEventsForCommand(['--json'], () => withJsonConsole(() => runWatchCommand(async (signal) => {
        const watcher = await runDebugCpu({directory, output, onRecord(record) {
          writeWatchRecord(Cpu.jsonOutputSchema, record);
          if (record.type === 'profile-completed') {
            if (++successes === 1) {
              previousProfile = readFileSync(output, 'utf8');
              // Let Vite finish the build hook before editing watched source.
              setTimeout(() => writeFileSync(directory + '/server.js', 'throw new Error("startup failed");'), 100);
            } else process.kill(process.pid, 'SIGINT');
          }
          if (record.type === 'profile-failed') {
            assert.equal(readFileSync(output, 'utf8'), previousProfile);
            setTimeout(() => writeFileSync(directory + '/server.js', 'console.log("Worker recovered"); export default {};'), 100);
          }
        }});
        try {
          if (!signal.aborted) await new Promise((resolve) => signal.addEventListener('abort', resolve, {once: true}));
        } finally {await watcher.close();}
      })));
    `,
    );
    const {error, stdout, stderr} = await new Promise<{
      error: Error | null;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      execFile(
        process.execPath,
        ['--experimental-vm-modules', joinPath(directory, 'runner.mjs')],
        {
          timeout: 20000,
          env: {...process.env, SHOPIFY_UNIT_TEST: '', SHOPIFY_FLAG_JSON: '1'},
        },
        (error, stdout, stderr) => resolve({error, stdout, stderr}),
      );
    });
    expect(error, stdout + '\n' + stderr).toMatchObject({code: 130});
    const records = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.map(({type}) => type)).toEqual([
      'watch-started',
      'build-started',
      'build-completed',
      'profile-started',
      'profile-completed',
      'build-started',
      'build-completed',
      'profile-started',
      'profile-failed',
      'build-started',
      'build-completed',
      'profile-started',
      'profile-completed',
      'watch-stopped',
    ]);
    expect(records[4]).toMatchObject({
      path: joinPath(directory, 'startup.cpuprofile'),
      format: 'cpuprofile',
    });
    expect(records[4].totalTimeMs).toBeGreaterThan(0);
    expect(stderr).toContain('Worker startup');
    expect(stdout).not.toContain('Worker startup');
    expect(
      JSON.parse(await readFile(joinPath(directory, 'startup.cpuprofile'))),
    ).toMatchObject({
      nodes: expect.any(Array),
      startTime: expect.any(Number),
      endTime: expect.any(Number),
    });
  });
}, 30000);
