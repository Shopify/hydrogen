import {afterEach, expect, it, vi} from 'vitest';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {captureJsonOutput} from '../../tests/output.js';
import {runWatchCommand, writeWatchRecord} from './watch.js';
import {codegenCommandOutputSchema} from './codegen/types.js';

afterEach(() => vi.restoreAllMocks());

it.each([
  ['SIGINT', 130],
  ['SIGTERM', 143],
] as const)(
  'waits for cleanup and restores exit and listeners after %s',
  async (signal, exitCode) => {
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const originalExit = process.exit;
    const previousExitCode = process.exitCode;
    const listeners = process.listeners(signal);
    try {
      const {stdout, stderr} = await captureJsonOutput(() =>
        runWatchCommand(async (abortSignal) => {
          writeWatchRecord(codegenCommandOutputSchema, {
            type: 'watch-started',
            directory: process.cwd(),
          });
          await new Promise<void>((resolve) => {
            abortSignal.addEventListener('abort', () => resolve(), {
              once: true,
            });
            process.emit(signal);
          });
          outputInfo('Closed watcher');
          writeWatchRecord(codegenCommandOutputSchema, {type: 'watch-stopped'});
        }),
      );
      expect(
        stdout
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line).type),
      ).toEqual(['watch-started', 'watch-stopped']);
      expect(JSON.parse(stderr)).toMatchObject({message: 'Closed watcher'});
      expect(process.exitCode).toBe(exitCode);
      expect(exit).toHaveBeenCalledWith(exitCode);
      expect(process.exit).toBe(originalExit);
      expect(process.listeners(signal)).toEqual(listeners);
    } finally {
      process.exitCode = previousExitCode;
    }
  },
);

it('restores process state when startup fails', async () => {
  const originalExit = process.exit;
  const listeners = process.listeners('SIGINT');
  await expect(
    runWatchCommand(async () => {
      throw new Error('Cannot watch project');
    }),
  ).rejects.toThrow('Cannot watch project');
  expect(process.exit).toBe(originalExit);
  expect(process.listeners('SIGINT')).toEqual(listeners);
});

it.each([
  ['SIGINT', 130, 1],
  ['SIGINT', 130, 127],
  ['SIGTERM', 143, 0],
  ['SIGTERM', 143, undefined],
] as const)(
  'keeps %s exit %s when a dependency requests %s',
  async (signal, exitCode, dependencyExitCode) => {
    const events: string[] = [];
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      events.push(`real-exit:${code}`);
      return undefined as never;
    });
    const originalExit = process.exit;
    const previousExitCode = process.exitCode;
    const listeners = process.listeners(signal);
    let exiting: Promise<unknown> | undefined;
    let releaseCleanup!: () => void;
    const cleanup = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    let signalHandled!: () => void;
    const ready = new Promise<void>((resolve) => {
      signalHandled = resolve;
    });
    const dependencyExit = () => {
      process.exitCode = dependencyExitCode;
      exiting = Promise.resolve(process.exit(dependencyExitCode));
    };
    process.on(signal, dependencyExit);
    try {
      const {stdout} = await captureJsonOutput(async () => {
        const running = runWatchCommand(async (abortSignal) => {
          events.push('watch-started');
          const aborted = new Promise<void>((resolve) =>
            abortSignal.addEventListener('abort', () => resolve(), {
              once: true,
            }),
          );
          process.emit(signal);
          await aborted;
          signalHandled();
          await cleanup;
          writeWatchRecord(codegenCommandOutputSchema, {type: 'watch-stopped'});
          events.push('watch-stopped');
        });
        try {
          await ready;
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(events).toEqual(['watch-started']);
        } finally {
          releaseCleanup();
          await running;
        }
      });
      await exiting;
      expect(JSON.parse(stdout)).toEqual({type: 'watch-stopped'});
      expect(exit).toHaveBeenCalledWith(exitCode);
      expect(exit.mock.calls.every(([code]) => code === exitCode)).toBe(true);
      expect(events.slice(0, 2)).toEqual(['watch-started', 'watch-stopped']);
      expect(events.slice(2)).toEqual(
        exit.mock.calls.map(() => `real-exit:${exitCode}`),
      );
      expect(process.exit).toBe(originalExit);
    } finally {
      process.removeListener(signal, dependencyExit);
      process.exitCode = previousExitCode;
    }
    expect(process.listeners(signal)).toEqual(listeners);
  },
);

it('rejects malformed lifecycle records', () => {
  expect(() =>
    codegenCommandOutputSchema.validate({
      type: 'generation-started',
      cycle: 0,
    }),
  ).toThrow();
  expect(() =>
    codegenCommandOutputSchema.validate({
      type: 'watch-started',
      directory: 'relative',
    }),
  ).toThrow();
  expect(() =>
    codegenCommandOutputSchema.validate({
      type: 'watch-stopped',
      unexpected: true,
    }),
  ).toThrow();
});
