import type {CachingStrategy} from './strategies';
import {CacheShort, generateCacheControlHeader} from './strategies';

function logCacheApiStatus(
  status: string | null,
  request: Request,
  response?: Response,
) {
  // const url = request.url;
  // eslint-disable-next-line no-console
  // console.log(status, 'cacheKey', url);
  // if (response) {
  //   let headersJson: Record<string, string> = {};
  //   response.headers.forEach((value, key) => {
  //     headersJson[key] = value;
  //   });
  //   console.log(`${status} response headers: `, headersJson);
  // }
}

function getCacheControlSetting(
  userCacheOptions?: CachingStrategy,
  options?: CachingStrategy,
): CachingStrategy {
  if (userCacheOptions && options) {
    return {
      ...userCacheOptions,
      ...options,
    };
  } else {
    return userCacheOptions || CacheShort();
  }
}

function generateDefaultCacheControlHeader(
  userCacheOptions?: CachingStrategy,
): string {
  return generateCacheControlHeader(getCacheControlSetting(userCacheOptions));
}

/**
 * Get an item from the cache. If a match is found, returns a tuple
 * containing the `JSON.parse` version of the response as well
 * as the response itself so it can be checked for staleness.
 */
async function getItem(
  cache: Cache,
  request: Request,
): Promise<Response | undefined> {
  if (!cache) return;

  const response = await cache.match(request);
  if (!response) {
    logCacheApiStatus('MISS', request);
    return;
  }

  logCacheApiStatus('HIT', request, response);

  return response;
}

/**
 * Put an item into the cache.
 */
async function setItem(
  cache: Cache,
  request: Request,
  response: Response,
  userCacheOptions: CachingStrategy,
) {
  if (!cache) return;

  /**
   * We are manually managing staled request by adding this workaround.
   * Why? cache control header support is dependent on hosting platform
   *
   * For example:
   *
   * Cloudflare's Cache API does not support `stale-while-revalidate`.
   * Cloudflare cache control header has a very odd behaviour.
   * Say we have the following cache control header on a request:
   *
   *   public, max-age=15, stale-while-revalidate=30
   *
   * When there is a cache.match HIT, the cache control header would become
   *
   *   public, max-age=14400, stale-while-revalidate=30
   *
   * == `stale-while-revalidate` workaround ==
   * Update response max-age so that:
   *
   *   max-age = max-age + stale-while-revalidate
   *
   * For example:
   *
   *   public, max-age=1, stale-while-revalidate=9
   *                    |
   *                    V
   *   public, max-age=10, stale-while-revalidate=9
   *
   * Store the following information in the response header:
   *
   *   cache-put-date   - UTC time string of when this request is PUT into cache
   *
   * Note on `cache-put-date`: The `response.headers.get('date')` isn't static. I am
   * not positive what date this is returning but it is never over 500 ms
   * after subtracting from the current timestamp.
   *
   * `isStale` function will use the above information to test for stale-ness of a cached response
   */

  const cacheControl = getCacheControlSetting(userCacheOptions);

  // The padded cache-control to mimic stale-while-revalidate
  const paddedCacheControlString = generateDefaultCacheControlHeader(
    getCacheControlSetting(cacheControl, {
      maxAge:
        (cacheControl.maxAge || 0) + (cacheControl.staleWhileRevalidate || 0),
    }),
  );
  // The cache-control we want to set on response
  const cacheControlString = generateDefaultCacheControlHeader(
    getCacheControlSetting(cacheControl),
  );

  // CF will override cache-control, so we need to keep a non-modified real-cache-control
  // cache-control is still necessary for mini-oxygen
  response.headers.set('cache-control', paddedCacheControlString);
  response.headers.set('real-cache-control', cacheControlString);
  response.headers.set('cache-put-date', new Date().toUTCString());

  logCacheApiStatus('PUT', request, response);
  await cache.put(request, response);
}

async function deleteItem(cache: Cache, request: Request) {
  if (!cache) return;

  logCacheApiStatus('DELETE', request);
  await cache.delete(request);
}

/**
 * Manually check the response to see if it's stale.
 */
function isStale(request: Request, response: Response) {
  const responseDate = response.headers.get('cache-put-date');
  const cacheControl = response.headers.get('real-cache-control');
  let responseMaxAge = 0;

  if (cacheControl) {
    const maxAgeMatch = cacheControl.match(/max-age=(\d*)/);
    if (maxAgeMatch && maxAgeMatch.length > 1) {
      responseMaxAge = parseFloat(maxAgeMatch[1]);
    }
  }

  if (!responseDate) {
    return false;
  }

  const ageInMs =
    new Date().valueOf() - new Date(responseDate as string).valueOf();
  const age = ageInMs / 1000;

  const result = age > responseMaxAge;

  if (result) {
    logCacheApiStatus('STALE', request, response);
  }

  return result;
}

/**
 *
 * @private
 */
export const CacheAPI = {
  get: getItem,
  set: setItem,
  delete: deleteItem,
  generateDefaultCacheControlHeader,
  isStale,
};
