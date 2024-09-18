import {type CachingStrategy} from './strategies';
import {type CrossRuntimeRequest, getDebugHeaders} from '../utils/request';
import {getCallerStackLine} from '../utils/callsites';
import {
  CacheActionFunctionParam,
  CacheKey,
  runWithCache,
  type DebugOptions,
} from './run-with-cache';
import {fetchWithServerCache, type FetchCacheOptions} from './server-fetch';
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
 * > Note:
 * > Sometimes a request to a third-party API might fail, so you shouldn't cache the result.
 * > To prevent caching, throw when a request fails. If you don't throw, then the result is cached.
 */
export function createWithCache<T = unknown>(
  cacheOptions: CreateWithCacheOptions,
) {
  const {cache, waitUntil, request} = cacheOptions;

  return {
    /**
     * This is a caching async function. Whatever data is returned from the `actionFn` will be cached according to the strategy provided.
     * Use the `CachingStrategy` to define a custom caching mechanism for your data. Or use one of the built-in caching strategies: `CacheNone`, `CacheShort`, `CacheLong`.
     */
    run<InferredActionReturn = T>(
      cacheKey: CacheKey,
      strategy: CachingStrategy,
      actionFn: ({
        addDebugData,
      }: CacheActionFunctionParam) =>
        | InferredActionReturn
        | Promise<InferredActionReturn>,
    ) {
      return runWithCache(cacheKey, actionFn, {
        strategy,
        cacheInstance: cache,
        waitUntil,
        debugInfo: {
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.(),
        },
      });
    },

    /**
     * Fetches data from a URL and caches the result according to the strategy provided.
     * The caching is skipped for non successful responses.
     */
    fetch<Body = T>(
      url: string,
      requestInit?: RequestInit,
      options?: Pick<DebugOptions, 'displayName'> &
        Pick<FetchCacheOptions, 'cache' | 'cacheKey' | 'shouldCacheResponse'>,
    ): Promise<{data: Body | null; response: Response}> {
      return fetchWithServerCache<Body | null>(url, requestInit ?? {}, {
        waitUntil,
        cacheKey: [url, requestInit],
        cacheInstance: cache,
        debugInfo: {
          url,
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.(),
          displayName: options?.displayName,
        },
        ...options,
      }).then(([data, response]) => ({data, response}));
    },
  };
}

export type WithCache = ReturnType<typeof createWithCache>;
