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
  shouldCacheResponse?: (body: any, response: Response) => boolean;
  waitUntil?: ExecutionContext['waitUntil'];
  returnType?: 'json' | 'text' | 'arrayBuffer' | 'blob';
};

function serializeResponse(body: any, response: Response) {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
    },
  ];
}

export async function fetchWithServerCache(
  url: string,
  options: Request | RequestInit,
  {
    cache,
    cacheOptions,
    cacheKey = [url, options],
    shouldCacheResponse = () => true,
    waitUntil,
    returnType = 'json',
  }: FetchCacheOptions = {},
): Promise<readonly [any, Response]> {
  const doFetch = async () => {
    const response = await fetch(url, options);
    let data;

    try {
      data = await response[returnType]();
    } catch {
      data = await response.text();
    }

    return [data, response] as const;
  };

  if (!cache || !cacheKey) return doFetch();

  const key = [
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...(typeof cacheKey === 'string' ? [cacheKey] : cacheKey),
  ];

  const cachedItem = await getItemFromCache(cache, key);

  if (cachedItem) {
    const [value, cacheResponse] = cachedItem;

    // collectQueryCacheControlHeaders(
    //   request,
    //   key,
    //   response.headers.get('cache-control'),
    // );

    /**
     * Important: Do this async
     */
    if (isStale(key, cacheResponse)) {
      const lockKey = ['lock', ...(typeof key === 'string' ? [key] : key)];

      // Run revalidation asynchronously
      const revalidatingPromise = getItemFromCache(cache, lockKey).then(
        async (lockExists) => {
          if (lockExists) return;

          await setItemInCache(cache, lockKey, true, CacheShort({maxAge: 10}));

          try {
            const [body, response] = await doFetch();

            if (shouldCacheResponse(body, response)) {
              await setItemInCache(
                cache,
                key,
                serializeResponse(body, response),
                cacheOptions,
              );
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

    const [body, init] = value;
    return [body, new Response(body, init)];
  }

  const [body, response] = await doFetch();

  /**
   * Important: Do this async
   */
  if (shouldCacheResponse(body, response)) {
    const setItemInCachePromise = setItemInCache(
      cache,
      key,
      serializeResponse(body, response),
      cacheOptions,
    );

    waitUntil?.(setItemInCachePromise);
  }

  //   collectQueryCacheControlHeaders(
  //     request,
  //     key,
  //     generateSubRequestCacheControlHeader(resolvedQueryOptions?.cache)
  //   );

  return [body, response];
}
