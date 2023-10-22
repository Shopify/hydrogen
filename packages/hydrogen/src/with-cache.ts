import {type CacheKey, runWithCache} from './cache/fetch';
import type {CachingStrategy} from './cache/strategies';

type CrossRuntimeRequest = {
  headers: {
    get?: (key: string) => string | null | undefined;
    [key: string]: any;
  };
};

type CreateWithCacheOptions = {
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache: Cache;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil: ExecutionContext['waitUntil'];
  /** The `request` object is used to access certain headers for debugging */
  request?: CrossRuntimeRequest;
};

function getHeader(key: string, request?: CrossRuntimeRequest) {
  const value = request?.headers?.get?.(key) ?? request?.headers?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Creates a utility function that executes an asynchronous operation
 * like `fetch` and caches the result according to the strategy provided.
 * Use this to call any third-party APIs from loaders or actions.
 * By default, it uses the `CacheShort` strategy.
 *
 */
export function createWithCache<T = unknown>({
  cache,
  waitUntil,
  request,
}: CreateWithCacheOptions): CreateWithCacheReturn<T> {
  return function withCache<T = unknown>(
    cacheKey: CacheKey,
    strategy: CachingStrategy,
    actionFn: () => T | Promise<T>,
  ) {
    return runWithCache<T>(cacheKey, actionFn, {
      strategy,
      cacheInstance: cache,
      waitUntil,
      debugInfo: {
        requestId: getHeader('request-id', request),
        purpose: getHeader('purpose', request),
      },
    });
  };
}

/**
 * This is a caching async function. Whatever data is returned from the `actionFn` will be cached according to the strategy provided.
 *
 * Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the built-in caching strategies: `CacheNone`, `CacheShort`, `CacheLong`.
 */
type CreateWithCacheReturn<T> = <U = T>(
  cacheKey: CacheKey,
  strategy: CachingStrategy,
  actionFn: () => U | Promise<U>,
) => Promise<U>;

export type WithCache = ReturnType<typeof createWithCache>;
