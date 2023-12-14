/// <reference types="@shopify/remix-oxygen" />

import {hashKey} from '../utils/hash.js';
import {
  CacheShort,
  CachingStrategy,
  NO_STORE,
  generateCacheControlHeader,
} from './strategies';
import type {StackInfo} from '../utils/callsites.js';
import {
  getItemFromCache,
  setItemInCache,
  isStale,
  getKeyUrl,
} from './sub-request';

/**
 * The cache key is used to uniquely identify a value in the cache.
 */
export type CacheKey = string | readonly unknown[];

export type FetchDebugInfo = {
  requestId?: string | null;
  graphql?: string | null;
  purpose?: string | null;
  stackInfo?: StackInfo;
  displayName?: string;
};

export type DebugInfo ={
  displayName?: string;
  url?: string;
  responseInit?: {
    status: number,
    statusText: string;
    headers?: [string, string][]
  };
}

export type WithCacheOptions<T = unknown> = {
  strategy?: CachingStrategy | null;
  cacheInstance?: Cache;
  shouldCacheResult?: (value: T) => boolean;
  waitUntil?: ExecutionContext['waitUntil'];
  debugInfo?: FetchDebugInfo;
};

export type FetchCacheOptions = {
  cache?: CachingStrategy;
  cacheInstance?: Cache;
  cacheKey?: CacheKey;
  shouldCacheResponse?: (body: any, response: Response) => boolean;
  waitUntil?: ExecutionContext['waitUntil'];
  returnType?: 'json' | 'text' | 'arrayBuffer' | 'blob';
  debugInfo?: FetchDebugInfo;
};

function toSerializableResponse(body: any, response: Response) {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
    },
  ] satisfies [any, ResponseInit];
}

function fromSerializableResponse([body, init]: [any, ResponseInit]) {
  return [body, new Response(body, init)] as const;
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

export async function runWithCache<T = unknown>(
  cacheKey: CacheKey,
  actionFn: (addDebugData: (info: DebugInfo) => void) => T | Promise<T>,
  {
    strategy = CacheShort(),
    cacheInstance,
    shouldCacheResult = () => true,
    waitUntil,
    debugInfo,
  }: WithCacheOptions<T>,
): Promise<T> {
  const startTime = Date.now();
  const key = hashKey([
    // '__HYDROGEN_CACHE_ID__', // TODO purgeQueryCacheOnBuild
    ...(typeof cacheKey === 'string' ? [cacheKey] : cacheKey),
  ]);

  let debugData: DebugInfo;
  const addDebugData = (info: DebugInfo) => {
    debugData = info;
  }

  const logSubRequestEvent =
    process.env.NODE_ENV === 'development'
      ? ({
          result,
          cacheStatus,
          overrideStartTime,
        }: {
          result?: any;
          cacheStatus?: 'MISS' | 'HIT' | 'STALE' | 'PUT';
          overrideStartTime?: number;
        }) => {
          globalThis.__H2O_LOG_EVENT?.({
            eventType: 'subrequest',
            url: debugData?.url || getKeyUrl(key),
            startTime: overrideStartTime || startTime,
            cacheStatus,
            responsePayload: result && result[0] || result,
            responseInit: result && result[1] || debugData.responseInit,
            cache: {
              status: cacheStatus,
              strategy: generateCacheControlHeader(strategy || {}),
              key,
            },
            waitUntil,
            ...debugInfo,
            displayName: debugInfo?.displayName || debugData?.displayName,
          } as any);
        }
      : undefined;

  if (!cacheInstance || !strategy || strategy.mode === NO_STORE) {
    const result = await actionFn(addDebugData);
    // Log non-cached requests
    logSubRequestEvent?.({result});
    return result;
  }

  const cachedItem = await getItemFromCache(cacheInstance, key);
  // console.log('--- Cache', cachedItem ? 'HIT' : 'MISS');

  if (cachedItem) {
    const [cachedResult, cacheInfo] = cachedItem;
    const cacheStatus = isStale(key, cacheInfo) ? 'STALE' : 'HIT';

    if (!swrLock.has(key) && cacheStatus === 'STALE') {
      swrLock.add(key);

      // Important: Run revalidation asynchronously.
      const revalidatingPromise = Promise.resolve().then(async () => {
        const revalidateStartTime = Date.now();
        try {
          const result = await actionFn(addDebugData);

          if (shouldCacheResult(result)) {
            await setItemInCache(cacheInstance, key, result, strategy);

            // Log PUT requests with the revalidate start time
            logSubRequestEvent?.({
              result,
              cacheStatus: 'PUT',
              overrideStartTime: revalidateStartTime,
            });
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

    // Log HIT/STALE requests
    logSubRequestEvent?.({
      result: cachedResult,
      cacheStatus,
    });

    return cachedResult;
  }

  const result = await actionFn(addDebugData);

  // Log MISS requests
  logSubRequestEvent?.({
    result,
    cacheStatus: 'MISS',
  });

  /**
   * Important: Do this async
   */
  if (shouldCacheResult(result)) {
    const setItemInCachePromise = Promise.resolve().then(async () => {
      const putStartTime = Date.now();
      await setItemInCache(cacheInstance, key, result, strategy);
      logSubRequestEvent?.({
        result,
        cacheStatus: 'PUT',
        overrideStartTime: putStartTime,
      });
    });

    waitUntil?.(setItemInCachePromise);
  }

  return result;
}

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
    debugInfo,
  }: FetchCacheOptions = {},
): Promise<readonly [any, Response]> {
  if (!cacheOptions && (!requestInit.method || requestInit.method === 'GET')) {
    cacheOptions = CacheShort();
  }

  return runWithCache(
    cacheKey,
    async () => {
      const response = await fetch(url, requestInit);
      let data;

      try {
        data = await response[returnType]();
      } catch {
        try {
          data = await response.text();
        } catch {
          // Getting a response without a valid body
          throw new Error(
            `Storefront API response code: ${
              response.status
            } (Request Id: ${response.headers.get('x-request-id')})`,
          );
        }
      }

      return toSerializableResponse(data, response);
    },
    {
      cacheInstance,
      waitUntil,
      strategy: cacheOptions ?? null,
      debugInfo,
      shouldCacheResult: (result) =>
        shouldCacheResponse(...fromSerializableResponse(result)),
    },
  ).then(fromSerializableResponse);
}
