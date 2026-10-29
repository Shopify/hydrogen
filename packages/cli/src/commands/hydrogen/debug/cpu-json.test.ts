import {afterEach, expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  readFile,
  fileExists,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import vm from 'node:vm';
import {captureJsonOutput} from '../../../../tests/output.js';
import {createCpuStartupProfiler} from '../../../lib/cpu-profiler.js';
import {isClassicProject} from '../../../lib/remix-config.js';
import {getViteConfig} from '../../../lib/vite-config.js';
import {importVite} from '../../../lib/import-utils.js';
import {withJsonConsole} from '../../../lib/json-output.js';
import {
  cpuJsonOutputSchema,
  type CpuWatchRecord,
} from '../../../lib/cpu-profiler/types.js';
import {writeWatchRecord} from '../../../lib/watch.js';
import * as watch from '../../../lib/watch.js';
import {runBuild} from '../build.js';
import DebugCpu, {runDebugCpuWatch} from './cpu.js';
import {deferPromise} from '../../../lib/defer.js';

vi.mock('../../../lib/cpu-profiler.js');
vi.mock('../../../lib/remix-config.js');
vi.mock('../../../lib/vite-config.js');
vi.mock('../../../lib/import-utils.js');
vi.mock('../build.js');
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const profile = {
  nodes: [],
  startTime: 10,
  endTime: 20,
  samples: [],
  timeDeltas: [],
};
const measurement = {profile, totalTimeMs: 10, totalScriptTimeMs: 3};

it('writes JSON records through the command and closes the profiler watch', async () => {
  await inTemporaryDirectory(async (directory) => {
    const {result, close} = mockCpuWatch(directory, async () => measurement);
    vi.mocked(runBuild).mockImplementationOnce(async (options) => {
      options.onBuildStart?.(1);
      options.onBuildFinish?.(1, result);
      return {result, close};
    });
    vi.spyOn(watch, 'runWatchCommand').mockImplementationOnce((run) =>
      run(AbortSignal.abort()),
    );
    const command = new DebugCpu(['--json'], {} as any);
    vi.spyOn(command as any, 'parse').mockResolvedValue({
      flags: {json: true, path: directory, output: 'startup.cpuprofile'},
    });
    const {stdout} = await captureJsonOutput(() => command.run());
    const output = joinPath(directory, 'startup.cpuprofile');
    expect(
      stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([
      {type: 'watch-started', directory},
      {type: 'build-started', cycle: 1},
      {type: 'build-completed', cycle: 1, ...result},
      {type: 'profile-started', cycle: 1},
      {
        type: 'profile-completed',
        cycle: 1,
        path: output,
        format: 'cpuprofile',
        totalTimeMs: 10,
        totalScriptTimeMs: 3,
      },
      {type: 'watch-stopped'},
    ]);
    expect(await readFile(output)).toBe(JSON.stringify(profile, null, 2));
    expect(close).toHaveBeenCalledOnce();
  });
});

function mockCpuWatch(
  directory: string,
  run: () => Promise<unknown>,
  close = vi.fn(async () => {}),
) {
  vi.mocked(createCpuStartupProfiler).mockResolvedValue({run} as any);
  vi.mocked(isClassicProject).mockResolvedValue(false);
  vi.mocked(getViteConfig).mockResolvedValue({
    remixConfig: {serverEntryPoint: joinPath(directory, 'server.ts')},
  } as any);
  const ready = deferPromise<Parameters<typeof runBuild>[0]>();
  const result = {
    directory,
    clientDirectory: joinPath(directory, 'dist/client'),
    serverDirectory: joinPath(directory, 'dist/server'),
    serverPath: joinPath(directory, 'dist/server/index.js'),
  };
  vi.mocked(runBuild).mockImplementation(async (options) => {
    ready.resolve(options);
    return {result, close};
  });
  return {
    ready: ready.promise as Promise<Parameters<typeof runBuild>[0]>,
    result,
    close,
  };
}

it('streams measurements, keeps native profiles, and recovers from profiling failures', async () => {
  await inTemporaryDirectory(async (directory) => {
    const output = joinPath(directory, 'startup.cpuprofile');
    const run = vi.fn(async () => {
      console.log('Worker diagnostic');
      return measurement;
    });
    const {ready, result, close} = mockCpuWatch(directory, run);
    const emittedRecords: CpuWatchRecord[] = [];
    const controller = new AbortController();
    const {stdout, stderr} = await captureJsonOutput(() =>
      withJsonConsole(async () => {
        const running = runDebugCpuWatch(
          {directory, output},
          controller.signal,
          (record) => {
            emittedRecords.push(record);
            writeWatchRecord(cpuJsonOutputSchema, record);
          },
        );
        try {
          const hooks = await ready;
          hooks.onBuildStart!(1);
          hooks.onBuildFinish!(1, result);
          await vi.waitFor(() =>
            expect(emittedRecords.at(-1)).toMatchObject({
              type: 'profile-completed',
              cycle: 1,
            }),
          );
          const contents = await readFile(output);
          expect(contents).toBe(JSON.stringify(profile, null, 2));
          run.mockRejectedValueOnce(new Error('Worker startup failed'));
          hooks.onBuildStart!(2);
          hooks.onBuildFinish!(2, result);
          await vi.waitFor(() =>
            expect(emittedRecords.at(-1)).toMatchObject({
              type: 'profile-failed',
              cycle: 2,
            }),
          );
          expect(await readFile(output)).toBe(contents);
          hooks.onBuildStart!(3);
          hooks.onBuildFinish!(3, result);
        } finally {
          controller.abort();
          await running;
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

it.each(['resolve', 'reject'] as const)(
  'waits for active profiling and its file write before stopping when profiling will %s',
  async (outcome) => {
    await inTemporaryDirectory(async (directory) => {
      const output = joinPath(directory, 'startup.cpuprofile');
      const pending = deferPromise<typeof measurement>();
      const {ready, result, close} = mockCpuWatch(
        directory,
        () => pending.promise,
      );
      const records: CpuWatchRecord[] = [];
      const controller = new AbortController();
      const running = runDebugCpuWatch(
        {directory, output},
        controller.signal,
        (record) => records.push(record),
      );
      const hooks = await ready;
      hooks.onBuildStart!(1);
      hooks.onBuildFinish!(1, result);
      controller.abort();
      try {
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(records.at(-1)?.type).toBe('profile-started');
        expect(await fileExists(output)).toBe(false);
      } finally {
        if (outcome === 'resolve') pending.resolve(measurement);
        else pending.reject(new Error('Worker startup failed'));
        await running;
      }
      expect(records.map(({type}) => type)).toEqual([
        'watch-started',
        'build-started',
        'build-completed',
        'profile-started',
        outcome === 'resolve' ? 'profile-completed' : 'profile-failed',
        'watch-stopped',
      ]);
      if (outcome === 'resolve')
        expect(await readFile(output)).toBe(JSON.stringify(profile, null, 2));
      else expect(await fileExists(output)).toBe(false);
    });
  },
);

it.each([false, true])(
  'keeps build cycles independent when a waiting server cycle fails: %s',
  async (failWaitingCycle) => {
    await inTemporaryDirectory(async (directory) => {
      const pending = deferPromise<typeof measurement>();
      const {result, close} = mockCpuWatch(directory, () => pending.promise);
      const {runBuild: actualRunBuild} =
        await vi.importActual<typeof import('../build.js')>('../build.js');
      vi.mocked(runBuild).mockImplementationOnce(actualRunBuild);
      vi.mocked(getViteConfig).mockResolvedValue({
        userViteConfig: {},
        remixConfig: {serverEntryPoint: joinPath(directory, 'server.ts')},
        clientOutDir: result.clientDirectory,
        serverOutDir: result.serverDirectory,
        serverOutFile: result.serverPath,
      } as any);
      const builds: any[] = [];
      vi.mocked(importVite).mockResolvedValue({
        createLogger: () => ({}),
        build: async (config: any) => {
          const plugin = {
            ...config.plugins.find((plugin: {name: string}) =>
              plugin.name.startsWith('hydrogen:cli:'),
            ),
            addWatchFile: vi.fn(),
          };
          builds.push(plugin);
          await plugin.buildStart();
          await plugin.writeBundle();
          return {close};
        },
      } as any);
      const records: CpuWatchRecord[] = [];
      const controller = new AbortController();
      const running = runDebugCpuWatch(
        {directory, output: joinPath(directory, 'startup.cpuprofile')},
        controller.signal,
        (record) => records.push(record),
      );
      try {
        await vi.waitFor(() =>
          expect(records.at(-1)?.type).toBe('profile-started'),
        );
        const client = builds[0];
        client.buildStart();
        client.buildEnd(new Error('Invalid client source'));
        expect(records).toEqual([
          {type: 'watch-started', directory},
          {type: 'build-started', cycle: 1},
          {type: 'build-completed', cycle: 1, ...result},
          {type: 'profile-started', cycle: 1},
          {type: 'build-started', cycle: 2},
          {
            type: 'build-failed',
            cycle: 2,
            error: {message: 'Invalid client source'},
          },
        ]);
        client.buildStart();
        await client.writeBundle();
        const server = builds[1];
        let serverBuildStarted = false;
        const rebuilding = server.buildStart().then(() => {
          serverBuildStarted = true;
        });
        await new Promise((resolve) => setImmediate(resolve));
        expect(serverBuildStarted).toBe(false);
        expect(records.at(-1)).toEqual({type: 'build-started', cycle: 3});
        if (failWaitingCycle) {
          client.buildStart();
          client.buildEnd(new Error('Invalid client source'));
          expect(records.at(-1)).toEqual({
            type: 'build-failed',
            cycle: 3,
            error: {message: 'Invalid client source'},
          });
        }
        pending.resolve(measurement);
        await rebuilding;
        expect(records.at(-1)).toMatchObject({
          type: 'profile-completed',
          cycle: 1,
        });
        const completedRecords = records.length;
        await server.writeBundle();
        if (failWaitingCycle) {
          expect(records).toHaveLength(completedRecords);
          client.buildStart();
          await client.writeBundle();
          await server.buildStart();
          await server.writeBundle();
        }
        await vi.waitFor(() =>
          expect(records.at(-1)).toMatchObject({
            type: 'profile-completed',
            cycle: failWaitingCycle ? 4 : 3,
          }),
        );
      } finally {
        pending.resolve(measurement);
        controller.abort();
        await running;
      }
    });
  },
);

it.each([
  [
    vm.runInNewContext('new Error("startup failed")'),
    {message: 'startup failed'},
  ],
  [
    new AbortError(
      'Cannot profile an unbundled import: foo',
      'Bundle this dependency into the server build before profiling startup.',
    ),
    {
      message: 'Cannot profile an unbundled import: foo',
      tryMessage:
        'Bundle this dependency into the server build before profiling startup.',
    },
  ],
])('preserves profiling error details for %s', async (error, expected) => {
  await inTemporaryDirectory(async (directory) => {
    const {ready, result} = mockCpuWatch(directory, async () => {
      throw error;
    });
    const records: CpuWatchRecord[] = [];
    const controller = new AbortController();
    const running = runDebugCpuWatch(
      {directory, output: joinPath(directory, 'startup.cpuprofile')},
      controller.signal,
      (record) => records.push(record),
    );
    try {
      const hooks = await ready;
      hooks.onBuildStart!(1);
      hooks.onBuildFinish!(1, result);
      await vi.waitFor(() =>
        expect(records.at(-1)).toEqual({
          type: 'profile-failed',
          cycle: 1,
          error: expected,
        }),
      );
    } finally {
      controller.abort();
      await running;
    }
  });
});

it.each(['resolve', 'reject'] as const)(
  'bounds a blocked build close and suppresses late profiling %s',
  async (outcome) => {
    await inTemporaryDirectory(async (directory) => {
      const output = joinPath(directory, 'startup.cpuprofile');
      const pending = deferPromise<typeof measurement>();
      const closePending = deferPromise<void>();
      const close = vi.fn(() => closePending.promise);
      const {ready, result} = mockCpuWatch(
        directory,
        () => pending.promise,
        close,
      );
      const records: CpuWatchRecord[] = [];
      const controller = new AbortController();
      const running = runDebugCpuWatch(
        {directory, output},
        controller.signal,
        (record) => records.push(record),
      );
      const hooks = await ready;
      hooks.onBuildStart!(1);
      hooks.onBuildFinish!(1, result);
      vi.useFakeTimers();
      try {
        controller.abort();
        await vi.advanceTimersByTimeAsync(2999);
        expect(records.at(-1)?.type).toBe('profile-started');
        expect(close).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(1);
        await running;
        expect(records.at(-1)?.type).toBe('watch-stopped');
        const stoppedRecords = [...records];
        if (outcome === 'resolve') pending.resolve(measurement);
        else pending.reject(new Error('Late startup failure'));
        closePending.resolve();
        await hooks.onServerBuildStart!();
        hooks.onBuildFinish!(2, result);
        expect(records).toEqual(stoppedRecords);
        expect(await fileExists(output)).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        pending.resolve(measurement);
        closePending.resolve();
        vi.useRealTimers();
        controller.abort();
        await running;
      }
    });
  },
);

it('declares schema help and rejects invalid measurements', () => {
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
