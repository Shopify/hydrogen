import {afterEach, expect, it, vi} from 'vitest';
import {deferPromise} from './defer.js';
import {setupResourceCleanup} from './resource-cleanup.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it.each(['resolve', 'reject', 'throw'] as const)(
  'exits with the requested code when cleanup will %s',
  async (outcome) => {
    const error = new Error('Cannot close watcher');
    const cleanup = vi.fn(() => {
      if (outcome === 'throw') throw error;
      return outcome === 'reject' ? Promise.reject(error) : Promise.resolve();
    });
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const restore = setupResourceCleanup(cleanup);
    const exitWithCleanup = process.exit as unknown as (
      code: number,
    ) => Promise<void>;
    try {
      if (outcome === 'resolve') {
        await expect(exitWithCleanup(143)).resolves.toBeUndefined();
      } else {
        await expect(exitWithCleanup(143)).rejects.toBe(error);
      }
      expect(cleanup).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledExactlyOnceWith(143);
    } finally {
      restore();
    }
  },
);

it('runs cleanup once and retains the fallback exit while cleanup is pending', async () => {
  vi.useFakeTimers();
  const pending = deferPromise<void>();
  const cleanup = vi.fn(() => pending.promise.then(() => {}));
  const exit = vi
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);
  const restore = setupResourceCleanup(cleanup);
  const exitWithCleanup = process.exit as unknown as (
    code: number,
  ) => Promise<void>;
  try {
    const first = exitWithCleanup(130);
    const second = exitWithCleanup(130);
    await vi.advanceTimersByTimeAsync(5000);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(130);
    pending.resolve();
    await Promise.all([first, second]);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    pending.resolve();
    restore();
  }
});
