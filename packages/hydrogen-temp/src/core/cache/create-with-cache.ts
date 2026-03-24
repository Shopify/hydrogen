import {type CachingStrategy} from './strategies';
import {type CrossRuntimeRequest, getDebugHeaders} from '../utils/request';
import {getCallerStackLine} from '../utils/callsites';
import {
  CacheActionFunctionParam,
  CacheKey,
  runWithCache,
} from './run-with-cache';
import {fetchWithServerCache} from './server-fetch';
import type {WaitUntil} from '../types';

type CreateWithCacheOptions = {
  /** An instance that implements the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) */
  cache: Cache;
  /** The `waitUntil` function is used to keep the current request/response lifecycle alive even after a response has been sent. It should be provided by your platform. */
  waitUntil: WaitUntil;
  /** The `request` object is used by the Subrequest profiler, and to access certain headers for debugging */
  request: CrossRuntimeRequest;
};

type WithCacheRunOptions<T> = {
  /** The cache key for this run */
  cacheKey: CacheKey;
  /**
   * Use the `CachingStrategy` to define a custom caching mechanism for your data.
   * Or use one of the pre-defined caching strategies: [`CacheNone`](/docs/api/hydrogen/utilities/cachenone), [`CacheShort`](/docs/api/hydrogen/utilities/cacheshort), [`CacheLong`](/docs/api/hydrogen/utilities/cachelong).
   */
  cacheStrategy: CachingStrategy;
  /** Useful to avoid accidentally caching bad results */
  shouldCacheResult: (value: T) => boolean;
};

type WithCacheFetchOptions<T> = {
  displayName?: string;
  /**
   * Use the `CachingStrategy` to define a custom caching mechanism for your data.
   * Or use one of the pre-defined caching strategies: [`CacheNone`](/docs/api/hydrogen/utilities/cachenone), [`CacheShort`](/docs/api/hydrogen/utilities/cacheshort), [`CacheLong`](/docs/api/hydrogen/utilities/cachelong).
   */
  cacheStrategy?: CachingStrategy;
  /** The cache key for this fetch */
  cacheKey?: CacheKey;
  /** Useful to avoid e.g. caching a successful response that contains an error in the body */
  shouldCacheResponse: (body: T, response: Response) => boolean;
};

export type WithCache = {
  run: <T>(
    options: WithCacheRunOptions<T>,
    fn: ({addDebugData}: CacheActionFunctionParam) => T | Promise<T>,
  ) => Promise<T>;
  fetch: <T>(
    url: string,
    requestInit: RequestInit,
    options: WithCacheFetchOptions<T>,
  ) => Promise<{data: T | null; response: Response}>;
};

export function createWithCache(
  cacheOptions: CreateWithCacheOptions,
): WithCache {
  const {cache, waitUntil, request} = cacheOptions;

  return {
    run: <T>(
      {cacheKey, cacheStrategy, shouldCacheResult}: WithCacheRunOptions<T>,
      fn: ({addDebugData}: CacheActionFunctionParam) => T | Promise<T>,
    ): Promise<T> => {
      return runWithCache(cacheKey, fn, {
        shouldCacheResult,
        strategy: cacheStrategy,
        cacheInstance: cache,
        waitUntil,
        debugInfo: {
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.(),
        },
      });
    },

    fetch: <T>(
      url: string,
      requestInit: RequestInit,
      options: WithCacheFetchOptions<T>,
    ): Promise<{data: T | null; response: Response}> => {
      return fetchWithServerCache<T | null>(url, requestInit ?? {}, {
        waitUntil,
        cacheKey: [url, requestInit],
        cacheInstance: cache,
        debugInfo: {
          url,
          ...getDebugHeaders(request),
          stackInfo: getCallerStackLine?.(),
          displayName: options?.displayName,
        },
        cache: options.cacheStrategy,
        ...options,
      }).then(([data, response]) => ({data, response}));
    },
  };
}
