import {CacheShort, CachingStrategy} from './strategies';
import {
  deleteItemFromCache,
  getItemFromCache,
  isStale,
  setItemInCache,
} from './subrequest';

export type FetchCacheOptions = {
  cache?: CachingStrategy;
  cacheInstance?: Cache;
  cacheKey?: string | readonly unknown[];
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

// Check if the response body has GraphQL errors
// https://spec.graphql.org/June2018/#sec-Response-Format
export const checkGraphQLErrors = (body: any) => !body?.errors;

/**
 * `fetch` equivalent that stores responses in cache.
 * Useful for calling third-party APIs that need to be cached.
 * @private
 */
export async function fetchWithServerCache(
  url: string,
  requestInit: Request | RequestInit,
  {
    cacheInstance,
    cache: cacheOptions,
    cacheKey = [url, requestInit],
    shouldCacheResponse = () => true,
    waitUntil,
    returnType = 'json',
  }: FetchCacheOptions = {},
): Promise<readonly [any, Response]> {
  if (!cacheOptions && (!requestInit.method || requestInit.method === 'GET')) {
    cacheOptions = CacheShort();
  }

  const doFetch = async () => {
    const response = await fetch(url, requestInit);
    let data;

    try {
      data = await response[returnType]();
    } catch {
      data = await response.text();
    }

    return [data, response] as const;
  };

  if (!cacheInstance || !cacheKey || !cacheOptions) return doFetch();

  const key = [
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...(typeof cacheKey === 'string' ? [cacheKey] : cacheKey),
  ];

  const cachedItem = await getItemFromCache(cacheInstance, key);
  // console.log('--- Cache', cachedItem ? 'HIT' : 'MISS');

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
      const revalidatingPromise = getItemFromCache(cacheInstance, lockKey).then(
        async (lockExists) => {
          if (lockExists) return;

          await setItemInCache(
            cacheInstance,
            lockKey,
            true,
            CacheShort({maxAge: 10}),
          );

          try {
            const [body, response] = await doFetch();

            if (shouldCacheResponse(body, response)) {
              await setItemInCache(
                cacheInstance,
                key,
                serializeResponse(body, response),
                cacheOptions,
              );
            }
          } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error(`Error generating async response: ${e.message}`);
          } finally {
            await deleteItemFromCache(cacheInstance, lockKey);
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
      cacheInstance,
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
