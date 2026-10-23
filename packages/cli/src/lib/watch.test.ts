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
