import {describe, expect, it, vi} from 'vitest';
import {runWithCache} from './run-with-cache';
import {CacheShort} from './strategies';
import {InMemoryCache} from './in-memory';

const strategy = CacheShort({maxAge: 1, staleWhileRevalidate: 9});
const key = 'background-error-test';

async function exerciseFailure({
  onRevalidationError,
  consoleError,
}: {
  onRevalidationError?: (error: unknown) => void;
  consoleError: ReturnType<typeof vi.spyOn>;
}) {
  const cache = new InMemoryCache();
  const pending: Promise<unknown>[] = [];
  const waitUntil = (promise: Promise<unknown>) => {
    pending.push(promise);
  };
  const sentinel = 'PRIVATE_PROVIDER_BODY_SENTINEL';
  const action = vi
    .fn()
    .mockResolvedValueOnce('stale-value')
    .mockRejectedValueOnce(new Error(sentinel))
    .mockResolvedValueOnce('new-value');
  const options = {
    cacheInstance: cache,
    strategy,
    shouldCacheResult: () => true,
    waitUntil,
    onRevalidationError,
  };

  expect(await runWithCache(key, action, options)).toBe('stale-value');
  await Promise.all(pending.splice(0));
  vi.advanceTimersByTime(3000);
  expect(await runWithCache(key, action, options)).toBe('stale-value');
  await Promise.all(pending.splice(0));
  expect(action).toHaveBeenCalledTimes(2);
  expect(await runWithCache(key, action, options)).toBe('stale-value');
  await Promise.all(pending.splice(0));
  expect(action).toHaveBeenCalledTimes(3);
  expect(consoleError.mock.calls.flat().map(String).join(' ')).not.toContain(
    sentinel,
  );
}

describe('background revalidation failures', () => {
  it('hands the untouched error to the callback and keeps stale data', async () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const handler = vi.fn();
    try {
      await exerciseFailure({onRevalidationError: handler, consoleError});
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].message).toBe(
        'PRIVATE_PROVIDER_BODY_SENTINEL',
      );
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });

  it('keeps the existing error log when no callback is supplied', async () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const cache = new InMemoryCache();
    const pending: Promise<unknown>[] = [];
    const action = vi
      .fn()
      .mockResolvedValueOnce('stale-value')
      .mockRejectedValueOnce(new Error('provider failed'));
    const options = {
      cacheInstance: cache,
      strategy,
      shouldCacheResult: () => true,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    };
    try {
      expect(await runWithCache(key, action, options)).toBe('stale-value');
      await Promise.all(pending.splice(0));
      vi.advanceTimersByTime(3000);
      expect(await runWithCache(key, action, options)).toBe('stale-value');
      await Promise.all(pending.splice(0));
      expect(consoleError).toHaveBeenCalledOnce();
      expect(consoleError.mock.calls[0][0].message).toBe(
        'SWR in sub-request failed: provider failed',
      );
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });

  it('cleans up the revalidation lock when the callback throws', async () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      await exerciseFailure({
        onRevalidationError: () => {
          throw new Error('PRIVATE_PROVIDER_BODY_SENTINEL');
        },
        consoleError,
      });
      expect(consoleError).toHaveBeenCalledWith('SWR error handler failed');
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });
});
