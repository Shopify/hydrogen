import {describe, beforeEach, it, expect, vi} from 'vitest';
import {type WithCache, createWithCache} from './create-with-cache';
import {InMemoryCache} from './in-memory';
import {getItemFromCache} from './sub-request';
import {CacheNone, CacheShort} from './strategies';

describe('createWithCache', () => {
  const waitUntil = vi.fn(() => {});
  const KEY = 'my-key';
  const VALUE = 'my-value';
  let cache: InMemoryCache;
  let withCache: WithCache;

  const fetchStub = vi.fn(() => Promise.resolve(new Response(VALUE)));
  vi.stubGlobal('fetch', fetchStub);

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryCache();
    withCache = createWithCache({cache, waitUntil});
    waitUntil.mockClear();
    return () => vi.useRealTimers();
  });

  it('creates a valid withCache instance', () => {
    expect(withCache.run).toBeInstanceOf(Function);
    expect(withCache.fetch).toBeInstanceOf(Function);
  });

  describe('withCache.run', () => {
    const actionFn = vi.fn(() => VALUE);

    beforeEach(() => {
      actionFn.mockClear();
    });

    it('skips cache for no-cache policy', async () => {
      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: CacheNone(),
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      expect(waitUntil).toHaveBeenCalledTimes(0);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);

      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: CacheNone(),
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      // No cache, always calls the action function:
      expect(waitUntil).toHaveBeenCalledTimes(0);
      expect(actionFn).toHaveBeenCalledTimes(2);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);
    });

    it('skips cache when throwing', async () => {
      actionFn.mockImplementationOnce(() => {
        return Promise.resolve().then(() => {
          throw new Error('test');
        });
      });

      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: CacheShort(),
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).rejects.toThrowError('test');

      expect(waitUntil).toHaveBeenCalledTimes(0);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);
    });

    it('skips cache when shouldCacheResult returns false', async () => {
      const strategy = CacheShort({maxAge: 1, staleWhileRevalidate: 9});
      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: (v) => v !== VALUE,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      expect(waitUntil).toHaveBeenCalledTimes(0);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);

      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: (v) => v !== VALUE,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      // Doesn't cache, so always runs the actionFn:
      expect(waitUntil).toHaveBeenCalledTimes(0);
      expect(actionFn).toHaveBeenCalledTimes(2);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);
    });

    it('stores results in the cache', async () => {
      const strategy = CacheShort({maxAge: 1, staleWhileRevalidate: 9});
      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      expect(waitUntil).toHaveBeenCalledTimes(1);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toContainEqual({
        value: VALUE,
      });

      // Less than 1 sec of the cache duration:
      vi.advanceTimersByTime(999);

      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      // Cache hit, nothing to update:
      expect(waitUntil).toHaveBeenCalledTimes(1);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toContainEqual({
        value: VALUE,
      });
    });

    it('applies stale-while-revalidate', async () => {
      const strategy = CacheShort({maxAge: 1, staleWhileRevalidate: 9});
      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      expect(waitUntil).toHaveBeenCalledTimes(1);
      expect(actionFn).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toContainEqual({
        value: VALUE,
      });

      // More than 1 sec of the cache duration:
      vi.advanceTimersByTime(3000);

      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);

      // Cache stale, call the action function again for SWR:
      expect(waitUntil).toHaveBeenCalledTimes(2);
      expect(actionFn).toHaveBeenCalledTimes(2);
      await expect(getItemFromCache(cache, KEY)).resolves.toContainEqual({
        value: VALUE,
      });

      // Make the cache expire. Note: We add a padded maxAge to the cache control
      // header to support SWR in Oxygen/CFW. Our InMemoryCache doesn't understand
      // this padded maxAge, so we need to advance timers considering the padded
      // value: maxAge + (2 * SWR) => 19 sec.
      vi.advanceTimersByTime(19001);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);

      // Cache is expired, call the action function again:
      await expect(
        withCache.run(
          {
            cacheKey: KEY,
            cacheStrategy: strategy,
            shouldCacheResult: () => true,
          },
          actionFn,
        ),
      ).resolves.toEqual(VALUE);
      expect(waitUntil).toHaveBeenCalledTimes(3);
      expect(actionFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('withCache.fetch', () => {
    const url = 'https://example.com';

    it('returns body and response', async () => {
      await expect(
        withCache.fetch(url, {}, {shouldCacheResponse: () => true}),
      ).resolves.toMatchObject({
        data: VALUE,
        response: expect.any(Response),
      });
    });

    it('stores results in the cache', async () => {
      const doFetch = () =>
        withCache.fetch(
          url,
          {},
          {cacheKey: KEY, shouldCacheResponse: () => true},
        );
      await doFetch();

      expect(waitUntil).toHaveBeenCalledTimes(1);

      // Less than 1 sec of the cache duration:
      vi.advanceTimersByTime(999);

      await expect(doFetch()).resolves.toMatchObject({
        data: VALUE,
        response: expect.any(Response),
      });

      // Cache hit, nothing to update:
      expect(waitUntil).toHaveBeenCalledTimes(1);
      await expect(getItemFromCache(cache, KEY)).resolves.toContainEqual({
        value: [VALUE, expect.objectContaining({status: 200})],
      });
    });

    it('skips cache when shouldCacheResponse returns false', async () => {
      const doFetch = () =>
        withCache.fetch(
          url,
          {},
          {cacheKey: KEY, shouldCacheResponse: () => false},
        );

      await expect(doFetch()).resolves.toMatchObject({
        data: VALUE,
        response: expect.any(Response),
      });

      expect(waitUntil).toHaveBeenCalledTimes(0);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);
    });

    it('skips cache when response is not successful', async () => {
      const notFoundResponse = new Response(VALUE, {status: 404});
      fetchStub.mockResolvedValue(notFoundResponse);
      const doFetch = () =>
        withCache.fetch(
          url,
          {},
          {cacheKey: KEY, shouldCacheResponse: () => true},
        );

      await expect(doFetch()).resolves.toStrictEqual({
        data: null,
        response: notFoundResponse,
      });

      expect(waitUntil).toHaveBeenCalledTimes(0);

      const {response} = await doFetch();
      expect(response).toStrictEqual(notFoundResponse);
      // Body can still be consumed:
      await expect(response.text()).resolves.toEqual(VALUE);

      expect(waitUntil).toHaveBeenCalledTimes(0);
      await expect(getItemFromCache(cache, KEY)).resolves.toEqual(undefined);
    });
  });
});
