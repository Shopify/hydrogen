import {CacheAPI} from './api';
import {
  CacheShort,
  type CachingStrategy,
  type AllCacheOptions,
} from './strategies.js';

/**
 * Wrapper Cache functions for sub queries
 */

/**
 * Cache API is weird. We just need a full URL, so we make one up.
 */
function getKeyUrl(key: string) {
  return `https://shopify.dev/?${key}`;
}

function getCacheOption(userCacheOptions?: CachingStrategy): AllCacheOptions {
  return userCacheOptions || CacheShort();
}

export function generateSubRequestCacheControlHeader(
  userCacheOptions?: CachingStrategy,
): string {
  return CacheAPI.generateDefaultCacheControlHeader(
    getCacheOption(userCacheOptions),
  );
}

/**
 * Get an item from the cache. If a match is found, returns a tuple
 * containing the `JSON.parse` version of the response as well
 * as the response itself so it can be checked for staleness.
 * @private
 */
export async function getItemFromCache(
  cache: Cache,
  key: string,
): Promise<undefined | [any, Response]> {
  if (!cache) return;
  const url = getKeyUrl(key);
  const request = new Request(url);

  const response = await CacheAPI.get(cache, request);

  if (!response) {
    return;
  }

  return [await response.json(), response];
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
