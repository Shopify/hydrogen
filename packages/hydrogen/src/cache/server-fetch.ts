import {CacheShort, CachingStrategy} from './strategies.js';
import {
  type CacheKey,
  runWithCache,
  type DebugOptions,
} from './run-with-cache.js';
import type {WaitUntil} from '../types.js';
import {parseJSON} from '../utils/parse-json.js';

export type FetchCacheOptions = {
  cache?: CachingStrategy;
  cacheInstance?: Cache;
  cacheKey?: CacheKey;
  shouldCacheResponse?: (body: any, response: Response) => boolean;
  waitUntil?: WaitUntil;
  debugInfo?: DebugOptions;
};

type SerializableResponse = [any, ResponseInit];

function toSerializableResponse(
  body: any,
  response: Response,
): SerializableResponse {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
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
    shouldCacheResponse = () => true,
    waitUntil,
    debugInfo,
  }: FetchCacheOptions = {},
): Promise<readonly [T, Response]> {
  if (!cacheOptions && (!requestInit.method || requestInit.method === 'GET')) {
    cacheOptions = CacheShort();
  }

  return runWithCache(
    cacheKey,
    async () => {
      const response = await fetch(url, requestInit);
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
