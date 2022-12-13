import {hashKey} from '../utils/hash.js';
import {CacheShort, CachingStrategy} from './strategies';
import {getItemFromCache, setItemInCache, isStale} from './sub-request';

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

// Lock to prevent revalidating the same sub-request
// in the same isolate. Note that different isolates
// in the same colo could duplicate the revalidation
// since this is only an in-memory lock.
// https://github.com/Shopify/oxygen-platform/issues/625
const swrLock = new Set<string>();

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

  const key = hashKey([
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...(typeof cacheKey === 'string' ? [cacheKey] : cacheKey),
  ]);

  const cachedItem = await getItemFromCache(cacheInstance, key);
  // console.log('--- Cache', cachedItem ? 'HIT' : 'MISS');

  if (cachedItem) {
    const [cachedValue, cacheInfo] = cachedItem;

    if (!swrLock.has(key) && isStale(key, cacheInfo)) {
      swrLock.add(key);

      // Important: Run revalidation asynchronously.
      const revalidatingPromise = Promise.resolve().then(async () => {
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
        } catch (error: any) {
          if (error.message) {
            error.message = 'SWR in sub-request failed: ' + error.message;
          }

          console.error(error);
        } finally {
          swrLock.delete(key);
        }
      });

      // Asynchronously wait for it in workers
      waitUntil?.(revalidatingPromise);
    }

    const [body, init] = cachedValue;
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

  return [body, response];
}
