import {afterEach, expect, it, vi} from 'vitest';
import {inTemporaryDirectory, readFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {captureJsonOutput} from '../../../../tests/output.js';
import {createCpuStartupProfiler} from '../../../lib/cpu-profiler.js';
import {isClassicProject} from '../../../lib/remix-config.js';
import {getViteConfig} from '../../../lib/vite-config.js';
import {withJsonConsole} from '../../../lib/json-output.js';
import {cpuJsonOutputSchema} from '../../../lib/cpu-profiler/types.js';
import {writeWatchRecord} from '../../../lib/watch.js';
import {runBuild} from '../build.js';
import DebugCpu, {runDebugCpu} from './cpu.js';

vi.mock('../../../lib/cpu-profiler.js');
vi.mock('../../../lib/remix-config.js');
vi.mock('../../../lib/vite-config.js');
vi.mock('../build.js');
afterEach(() => vi.restoreAllMocks());

it('streams measurements, keeps native profiles, and recovers from profiling failures', async () => {
  await inTemporaryDirectory(async (directory) => {
    const output = joinPath(directory, 'startup.cpuprofile');
    const profile = {
      nodes: [],
      startTime: 10,
      endTime: 20,
      samples: [],
      timeDeltas: [],
    };
    const run = vi.fn(async () => {
      console.log('Worker diagnostic');
      return {profile, totalTimeMs: 10, totalScriptTimeMs: 3};
    });
    vi.mocked(createCpuStartupProfiler).mockResolvedValue({run} as any);
    vi.mocked(isClassicProject).mockResolvedValue(false);
    vi.mocked(getViteConfig).mockResolvedValue({
      remixConfig: {serverEntryPoint: joinPath(directory, 'server.ts')},
    } as any);
    let hooks: Parameters<typeof runBuild>[0];
    const close = vi.fn(async () => {});
    vi.mocked(runBuild).mockImplementation(async (options) => {
      hooks = options;
      return {result: {} as any, close};
    });
    const result = {
      directory,
      clientDirectory: joinPath(directory, 'dist/client'),
      serverDirectory: joinPath(directory, 'dist/server'),
      serverPath: joinPath(directory, 'dist/server/index.js'),
    };
    const {stdout, stderr} = await captureJsonOutput(() =>
      withJsonConsole(async () => {
        const watcher = await runDebugCpu({
          directory,
          output,
          onRecord: (record) => writeWatchRecord(cpuJsonOutputSchema, record),
        });
        try {
          hooks!.onBuildStart!(1);
          await hooks!.onServerBuildFinish!(result);
          const contents = await readFile(output);
          expect(contents).toBe(JSON.stringify(profile, null, 2));
          run.mockRejectedValueOnce(new Error('Worker startup failed'));
          hooks!.onBuildStart!(2);
          await hooks!.onServerBuildFinish!(result);
          expect(await readFile(output)).toBe(contents);
          hooks!.onBuildStart!(3);
          await hooks!.onServerBuildFinish!(result);
        } finally {
          await watcher.close();
          await watcher.close();
        }
      }),
    );
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
    expect(records[4]).toEqual({
      type: 'profile-completed',
      cycle: 1,
      path: output,
      format: 'cpuprofile',
      totalTimeMs: 10,
      totalScriptTimeMs: 3,
    });
    expect(
      stderr
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).message),
    ).toEqual(['Worker diagnostic', 'Worker diagnostic']);
    expect(stdout).not.toContain('\u001b');
    expect(close).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith(
      result.serverPath,
      joinPath(directory, 'server.ts'),
    );
  });
});

it('declares JSON flags, help, and strict measurement schemas', () => {
  expect(DebugCpu.flags.json).toBeDefined();
  expect(DebugCpu.description).toContain(cpuJsonOutputSchema.name);
  expect(() =>
    cpuJsonOutputSchema.validate({
      type: 'profile-completed',
      cycle: 1,
      path: '/profile.cpuprofile',
      format: 'cpuprofile',
      totalTimeMs: -1,
      totalScriptTimeMs: 0,
    }),
  ).toThrow();
  expect(() =>
    cpuJsonOutputSchema.validate({type: 'profile-started', cycle: 0}),
  ).toThrow();
});
