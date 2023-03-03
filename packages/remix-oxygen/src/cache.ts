function debugLog(...args: any[]) {
  // Enable for debugging
  // console.log(...args);
}

/**
 * Get an item from the cache. If a match is found, returns a tuple
 * containing the `JSON.parse` version of the response as well
 * as the response itself so it can be checked for staleness.
 */
export async function getItemFromCache(
  cache: Cache,
  request: Request,
): Promise<Response | undefined> {
  const response = await cache.match(request);
  if (!response) {
    debugLog('MISS', request.url);
    return;
  }

  debugLog('HIT', request.url);

  return response;
}

function getCacheControlHeader(response: Response) {
  return response.headers.get('cache-control') || 'no-store';
}

export function isPublicCacheControlHeader(response: Response) {
  return /(^|\s|,)public($|\s|,)/i.test(getCacheControlHeader(response));
}

/**
 * Put an item into the cache.
 */
export async function setItemInCache(
  cache: Cache,
  request: Request,
  response: Response,
) {
  if (!isPublicCacheControlHeader(response)) return null;
  request = new Request(request);

  /**
   * We are manually managing staled request by adding this workaround.
   * Why? cache control header support is dependent on hosting platform
   *
   * For example:
   *
   * Oxygen's Cache API does not support `stale-while-revalidate`.
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

  const cacheControlHeader = getCacheControlHeader(response);
  const cacheControl = parseCacheControl(cacheControlHeader);

  // The padded cache-control to mimic stale-while-revalidate
  request.headers.set(
    'cache-control',
    generateCacheControlHeader({
      ...cacheControl,
      'max-age': String(
        Number(cacheControl['max-age'] || 0) +
          Number(cacheControl['stale-while-revalidate'] || 0),
      ),
    }),
  );

  // Oxygen will override cache-control, so we need to
  // keep a non-modified version in real-cache-control.
  response.headers.set('cache-put-date', new Date().toUTCString());
  response.headers.set('real-cache-control', cacheControlHeader);

  debugLog('PUT', request.url);
  await cache.put(request, response);
}

export async function deleteItemFromCache(cache: Cache, request: Request) {
  debugLog('DELETE', request.url);
  await cache.delete(request);
}

/**
 * Manually check the response to see if it's stale.
 */
export function isStale(request: Request, responseHeaders: Headers) {
  const responseDate = responseHeaders.get('cache-put-date');
  const cacheControlHeader = responseHeaders.get('real-cache-control');
  let responseMaxAge = 0;

  if (cacheControlHeader) {
    const maxAgeMatch = cacheControlHeader.match(/max-age=(\d*)/);
    if (maxAgeMatch && maxAgeMatch.length > 1) {
      responseMaxAge = parseFloat(maxAgeMatch[1]);
    }
  }

  if (responseDate) {
    const ageInSeconds =
      (new Date().valueOf() - new Date(responseDate as string).valueOf()) /
      1000;

    if (ageInSeconds > responseMaxAge) {
      debugLog('STALE', request.url);
      return true;
    }
  }

  return false;
}

const CACHE_CONTROL_KEYS = [
  'max-age',
  'stale-while-revalidate',
  's-maxage',
  'stale-if-error',
] as const;

type CacheControlKey = (typeof CACHE_CONTROL_KEYS)[number];

function generateCacheControlHeader(
  cacheOptions: Record<CacheControlKey, string | undefined>,
): string {
  const cacheControl = ['public'];

  for (const [key, value] of Object.entries(cacheOptions)) {
    if (CACHE_CONTROL_KEYS.includes(key as CacheControlKey)) {
      cacheControl.push(`${key}=${value}`);
    }
  }

  return cacheControl.join(', ');
}

function parseCacheControl(cacheControlHeader: string) {
  return Object.fromEntries(
    cacheControlHeader
      .toLowerCase()
      .split(',')
      .map((part) =>
        part
          .trim()
          .split('=')
          .map((s) => s?.trim()),
      )
      .filter(([key]) => CACHE_CONTROL_KEYS.includes(key as CacheControlKey)),
  ) as Record<CacheControlKey, string | undefined>;
}

export function shouldCacheRequest(request: Request) {
  return (
    request.method === 'GET' &&
    // Allow disabling cache in development
    (process.env.NODE_ENV !== 'development' ||
      // This header is added when enabling "Disable cache" in Chrome devtools
      request.headers.get('Cache-Control') !== 'no-store')
  );
}

// Lock to prevent revalidating the same sub-request
// in the same isolate. Note that different isolates
// in the same colo could duplicate the revalidation
// since this is only an in-memory lock.
// https://github.com/Shopify/oxygen-platform/issues/625
const swrLock = new Set<string>();

export function cacheResponse(
  request: Request,
  getResponse: () => Response | Promise<Response>,
  cache: Cache,
  waitUntil: ExecutionContext['waitUntil'],
) {
  if (swrLock.has(request.url)) return;

  swrLock.add(request.url);

  waitUntil(
    (async () => {
      try {
        const response = await getResponse();
        if (response.status === 200 && !response.headers.has('Set-Cookie')) {
          await setItemInCache(cache, request, response);
        }
      } catch (error: any) {
        if (error.message) {
          error.message =
            'Failed to cache full-page response: ' + error.message;
        }

        console.error(error);
      } finally {
        swrLock.delete(request.url);
      }
    })(),
  );
}
