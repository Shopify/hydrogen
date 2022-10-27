import {CacheShort, CachingStrategy} from './strategies';
import {
  deleteItemFromCache,
  getItemFromCache,
  isStale,
  setItemInCache,
} from './subrequest';

export type FetchCacheOptions = {
  cache?: Cache;
  cacheKey?: string | readonly unknown[];
  cacheOptions?: CachingStrategy;
  shouldCacheResponse?: (body: any) => boolean;
  waitUntil?: ExecutionContext['waitUntil'];
};

export async function fetchWithServerCache(
  url: string,
  options: Request | RequestInit,
  {
    cache,
    cacheOptions,
    cacheKey = [url, options],
    shouldCacheResponse = () => true,
    waitUntil,
  }: FetchCacheOptions = {},
) {
  const doFetch = () => fetch(url, options);

  if (!cache || !cacheKey) return doFetch();

  const key = [
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...(typeof cacheKey === 'string' ? [cacheKey] : cacheKey),
  ];

  const cachedResponse = await getItemFromCache(cache, key);

  if (cachedResponse) {
    // collectQueryCacheControlHeaders(
    //   request,
    //   key,
    //   response.headers.get('cache-control'),
    // );

    /**
     * Important: Do this async
     */
    if (isStale(key, cachedResponse)) {
      const lockKey = ['lock', ...(typeof key === 'string' ? [key] : key)];

      // Run revalidation asynchronously
      const revalidatingPromise = getItemFromCache(cache, lockKey).then(
        async (lockExists) => {
          if (lockExists) return;

          await setItemInCache(cache, lockKey, true, CacheShort({maxAge: 10}));

          try {
            const output = await doFetch();

            if (shouldCacheResponse(output)) {
              await setItemInCache(cache, key, output, cacheOptions);
            }
          } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error(`Error generating async response: ${e.message}`);
          } finally {
            await deleteItemFromCache(cache, lockKey);
          }
        },
      );

      // Asynchronously wait for it in workers
      waitUntil?.(revalidatingPromise);
    }

    return cachedResponse;
  }

  const freshResponse = await doFetch();

  /**
   * Important: Do this async
   */
  if (shouldCacheResponse(freshResponse)) {
    const setItemInCachePromise = setItemInCache(
      cache,
      key,
      freshResponse,
      cacheOptions,
    );

    waitUntil?.(setItemInCachePromise);
  }

  //   collectQueryCacheControlHeaders(
  //     request,
  //     key,
  //     generateSubRequestCacheControlHeader(resolvedQueryOptions?.cache)
  //   );

  return freshResponse;
}
