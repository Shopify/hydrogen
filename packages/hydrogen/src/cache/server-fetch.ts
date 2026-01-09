import {CacheShort, CachingStrategy} from './strategies.js';
import {
  type CacheKey,
  runWithCache,
  type DebugOptions,
} from './run-with-cache.js';
import type {WaitUntil} from '../types.js';

export type FetchCacheOptions = {
  cache?: CachingStrategy;
  cacheInstance?: Cache;
  cacheKey?: CacheKey;
  shouldCacheResponse?: (body: any, response: Response) => boolean;
  waitUntil?: WaitUntil;
  returnType?: 'json' | 'text' | 'arrayBuffer' | 'blob';
  debugInfo?: DebugOptions;
  /** Called when fresh raw headers are received (skipped on cache hits) */
  onRawHeaders?: (headers: Headers) => void;
};

// Exclude headers that are not safe or useful to cache
// since they are individual to each user session/request.
const excludedHeaders = ['set-cookie', 'server-timing'];

function toSerializableResponse(body: any, response: Response) {
  return [
    body,
    {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers].filter(
        ([key]) => !excludedHeaders.includes(key.toLowerCase()),
      ),
    },
  ] satisfies [any, ResponseInit];
}

function fromSerializableResponse([body, init]: [any, ResponseInit]) {
  return [body, new Response(body, init)] as const;
}

// Check if the response body has GraphQL errors
// https://spec.graphql.org/June2018/#sec-Response-Format
export const checkGraphQLErrors = (body: any, response: Response) =>
  !body?.errors && response.status < 400;

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
    onRawHeaders,
  }: FetchCacheOptions = {},
): Promise<readonly [any, Response]> {
  if (!cacheOptions && (!requestInit.method || requestInit.method === 'GET')) {
    cacheOptions = CacheShort();
  }

  return runWithCache(
    cacheKey,
    async () => {
      const response = await fetch(url, requestInit);
      onRawHeaders?.(response.headers);

      let data;

      try {
        data = await response[returnType]();
      } catch {
        try {
          data = await response.text();
        } catch {
          // Getting a response without a valid body
          return toSerializableResponse('', response);
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
