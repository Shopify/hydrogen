import {CacheShort, CachingStrategy} from './strategies.js';
import {
  type CacheKey,
  runWithCache,
  type DebugOptions,
} from './run-with-cache.js';
import type {WaitUntil} from '../types.js';
import {parseJSON} from '../utils/parse-json.js';

export type FetchCacheOptions<T = any> = {
  cache?: CachingStrategy;
  cacheInstance?: Cache;
  cacheKey?: CacheKey;
  shouldCacheResponse: (body: T, response: Response) => boolean;
  waitUntil?: WaitUntil;
  debugInfo?: DebugOptions;
  onRawHeaders?: (headers: Headers) => void;
};

type SerializableResponse = [any, ResponseInit];

// Exclude headers that are not safe or useful to cache
// since they are individual to each user session/request.
const excludedHeaders = ['set-cookie', 'server-timing'];

function toSerializableResponse(
  body: any,
  response: Response,
): SerializableResponse {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers].filter(
        ([key]) => !excludedHeaders.includes(key.toLowerCase()),
      ),
    },
  ];
}

function fromSerializableResponse([body, init]: SerializableResponse) {
  return [body, new Response(body, init)] as const;
}

/**
 * `fetch` equivalent that stores responses in cache.
 * Useful for calling third-party APIs that need to be cached.
 * @private
 */
export async function fetchWithServerCache<T = unknown>(
  url: string,
  requestInit: Request | RequestInit,
  {
    cacheInstance,
    cache: cacheOptions,
    cacheKey = [url, requestInit],
    shouldCacheResponse,
    waitUntil,
    debugInfo,
    onRawHeaders,
  }: FetchCacheOptions,
): Promise<readonly [T, Response]> {
  if (!cacheOptions && (!requestInit.method || requestInit.method === 'GET')) {
    cacheOptions = CacheShort();
  }

  return runWithCache(
    cacheKey,
    async () => {
      const response = await fetch(url, requestInit);
      onRawHeaders?.(response.headers);

      if (!response.ok) {
        // Skip caching and consuming the response body
        return response;
      }

      let data: any = await response.text().catch(() => '');

      try {
        if (data) data = parseJSON(data);
      } catch {}

      return toSerializableResponse(data, response);
    },
    {
      cacheInstance,
      waitUntil,
      strategy: cacheOptions ?? null,
      debugInfo,
      shouldCacheResult: (payload) => {
        return 'ok' in payload
          ? false
          : shouldCacheResponse(...fromSerializableResponse(payload));
      },
    },
  ).then((payload) => {
    return 'ok' in payload
      ? ([null, payload] as const)
      : fromSerializableResponse(payload);
  });
}
