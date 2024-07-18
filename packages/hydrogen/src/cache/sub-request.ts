import {parseJSON} from '../utils/parse-json';
import {CacheAPI} from './api';
import {
  CacheDefault,
  type CachingStrategy,
  type AllCacheOptions,
} from './strategies.js';

/**
 * Wrapper Cache functions for sub queries
 */

/**
 * Cache API is weird. We just need a full URL, so we make one up.
 */
export function getKeyUrl(key: string) {
  return `https://shopify.dev/?${encodeURIComponent(key)}`;
}

function getCacheOption(userCacheOptions?: CachingStrategy): AllCacheOptions {
  return userCacheOptions || CacheDefault();
}

type CacheStatus = 'HIT' | 'MISS' | 'STALE';

/**
 * Get an item from the cache. If a match is found, returns a tuple
 * containing the `JSON.parse` version of the response as well
 * as the response itself so it can be checked for staleness.
 * @private
 */
export async function getItemFromCache<T = any>(
  cache: Cache,
  key: string,
): Promise<{value?: T; status: CacheStatus}> {
  if (!cache) return {status: 'MISS'};

  const url = getKeyUrl(key);
  const request = new Request(url);

  const response = await CacheAPI.get(cache, request);

  if (!response) return {status: 'MISS'};

  try {
    const text = await response.text();
    return {
      value: text ? parseJSON(text) : undefined,
      status: text
        ? (response.headers.get('oxygen-cache-status') as null | CacheStatus) ??
          (isStale(key, response) ? 'STALE' : 'HIT')
        : 'MISS',
    };
  } catch {
    return {value: undefined, status: 'MISS'};
  }
}

/**
 * Put an item into the cache.
 * @private
 */
export async function setItemInCache(
  cache: Cache,
  key: string,
  value: any,
  userCacheOptions?: CachingStrategy,
  tags?: string[],
) {
  if (!cache) return;

  const url = getKeyUrl(key);
  const request = new Request(url);
  const response = new Response(JSON.stringify(value));

  await CacheAPI.set(
    cache,
    request,
    response,
    getCacheOption(userCacheOptions),
  );
}

/**
 *
 * @private
 */
export async function deleteItemFromCache(cache: Cache, key: string) {
  if (!cache) return;

  const url = getKeyUrl(key);
  const request = new Request(url);

  await CacheAPI.delete(cache, request);
}

/**
 * Manually check the response to see if it's stale.
 * @private
 */
export function isStale(key: string, response: Response) {
  return CacheAPI.isStale(new Request(getKeyUrl(key)), response);
}
