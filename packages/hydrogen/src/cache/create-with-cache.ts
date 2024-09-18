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
 * Creates utility functions to store data in cache with stale-while-revalidate support.
 * - Use `withCache.fetch` to simply fetch data from a third-party API.
 * - Use the more advanced `withCache.run` to execute any asynchronous operation.
 */
export function createWithCache<T = unknown>(
  cacheOptions: CreateWithCacheOptions,
) {
  const {cache, waitUntil, request} = cacheOptions;

  return {
    /**
     * Utility function that executes asynchronous operations and caches the
     * result according to the strategy provided. Use this to do any type
     * of asynchronous operation where `withCache.fetch` is insufficient.
     * For example, when making multiple calls to a third-party API where the
     * result of all of them needs to be cached under the same cache key.
     * Whatever data is returned from the `actionFn` will be cached according
     * to the strategy provided.
     * Use the `CachingStrategy` to define a custom caching mechanism for your data.
     * Or use one of the built-in caching strategies: `CacheNone`, `CacheShort`, `CacheLong`.
     * > Note:
     * > To prevent caching the result you must throw an error. Otherwise, the result will be cached.
     * > For example, if you call `fetch` but the response is not successful (e.g. status code >= 400),
     * > you should throw an error. Otherwise, the response will be cached.
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
     * When the response is not successful (e.g. status code >= 400), the caching is
     * skipped automatically and the returned `data` is `null`.
     * You can also prevent caching by using the `shouldCacheResponse` option and returning
     * `false` from the function you pass in. For example, you might want to fetch data from a
     * third-party GraphQL API but not cache the result if the GraphQL response body contains errors.
     */
    fetch<Body = T>(
      url: string,
      requestInit?: RequestInit,
      options?: Pick<DebugOptions, 'displayName'> &
        Pick<
          FetchCacheOptions<Body>,
          'cache' | 'cacheKey' | 'shouldCacheResponse'
        >,
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
