import {type CachingStrategy} from './strategies';
import {type CrossRuntimeRequest, getDebugHeaders} from '../utils/request';
import {getCallerStackLine} from '../utils/callsites';
import {
  CacheActionFunctionParam,
  CacheKey,
  runWithCache,
} from './run-with-cache';
import type {WaitUntil} from '../types';

type CreateWithCacheOptions = {
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache: Cache;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil: WaitUntil;
  /** The `request` object is used to access certain headers for debugging */
  request?: CrossRuntimeRequest;
};

/**
 * Creates a utility function that executes an asynchronous operation
 * like `fetch` and caches the result according to the strategy provided.
 * Use this to call any third-party APIs from loaders or actions.
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
    actionFn: ({addDebugData}: CacheActionFunctionParam) => T | Promise<T>,
  ) {
    return runWithCache<T>(cacheKey, actionFn, {
      strategy,
      cacheInstance: cache,
      waitUntil,
      debugInfo: {
        ...getDebugHeaders(request),
        stackInfo: getCallerStackLine?.(),
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
  actionFn: ({addDebugData}: CacheActionFunctionParam) => U | Promise<U>,
) => Promise<U>;

export type WithCache = ReturnType<typeof createWithCache>;
