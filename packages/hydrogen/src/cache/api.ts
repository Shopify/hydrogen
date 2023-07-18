import type {CachingStrategy} from './strategies';
import {CacheShort, generateCacheControlHeader} from './strategies';

function logCacheApiStatus(
  status: string | null,
  request: Request,
  response?: Response,
) {
  const url = request.url;
  if (/Product\(/.test(url)) {
    // eslint-disable-next-line no-console
    console.log(status, 'cacheKey', url);

    if (response) {
      let headersJson: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersJson[key] = value;
      });

      console.log(`${status} response headers: `, headersJson);
    }
  }
}

const productUrl = `https://shopify.dev/?https%3A%2F%2Fhydrogen-preview.myshopify.com%2Fapi%2F2023-04%2Fgraphql.json%7B%22query%22%3A%22query%20Product(%20%24country%3A%20CountryCode%20%24language%3A%20LanguageCode%20%24handle%3A%20String!%20%24selectedOptions%3A%20%5BSelectedOptionInput!%5D!%20)%20%40inContext(country%3A%20%24country%2C%20language%3A%20%24language)%20%7B%20product(handle%3A%20%24handle)%20%7B%20id%20title%20vendor%20handle%20descriptionHtml%20description%20options%20%7B%20name%20values%20%7D%20selectedVariant%3A%20variantBySelectedOptions(selectedOptions%3A%20%24selectedOptions)%20%7B%20...ProductVariantFragment%20%7D%20media(first%3A%207)%20%7B%20nodes%20%7B%20...Media%20%7D%20%7D%20variants(first%3A%201)%20%7B%20nodes%20%7B%20...ProductVariantFragment%20%7D%20%7D%20seo%20%7B%20description%20title%20%7D%20%7D%20shop%20%7B%20name%20primaryDomain%20%7B%20url%20%7D%20shippingPolicy%20%7B%20body%20handle%20%7D%20refundPolicy%20%7B%20body%20handle%20%7D%20%7D%20%7D%20fragment%20Media%20on%20Media%20%7B%20__typename%20mediaContentType%20alt%20previewImage%20%7B%20url%20%7D%20...%20on%20MediaImage%20%7B%20id%20image%20%7B%20id%20url%20width%20height%20%7D%20%7D%20...%20on%20Video%20%7B%20id%20sources%20%7B%20mimeType%20url%20%7D%20%7D%20...%20on%20Model3d%20%7B%20id%20sources%20%7B%20mimeType%20url%20%7D%20%7D%20...%20on%20ExternalVideo%20%7B%20id%20embedUrl%20host%20%7D%20%7D%20fragment%20ProductVariantFragment%20on%20ProductVariant%20%7B%20id%20availableForSale%20selectedOptions%20%7B%20name%20value%20%7D%20image%20%7B%20id%20url%20altText%20width%20height%20%7D%20price%20%7B%20amount%20currencyCode%20%7D%20compareAtPrice%20%7B%20amount%20currencyCode%20%7D%20sku%20title%20unitPrice%20%7B%20amount%20currencyCode%20%7D%20product%20%7B%20title%20handle%20%7D%20%7D%22%2C%22variables%22%3A%7B%22handle%22%3A%22the-full-stack%22%2C%22selectedOptions%22%3A%5B%5D%2C%22country%22%3A%22US%22%2C%22language%22%3A%22EN%22%7D%7D`;
function logString(url: string, start: number, end: number) {
  console.log(
    'url match?',
    url.substring(start, end) === productUrl.substring(start, end),
  );
  console.log(
    `${url.substring(start, end)}\n${productUrl.substring(start, end)}`,
  );
}

function changeCacheKey(url: string) {
  // logString(url, 80, 120);
  if (url === productUrl) {
    return 'https://shopify.dev?query=Product(';
  } else {
    return url;
  }
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
  userCacheOptions?: CachingStrategy,
): Promise<Response | undefined> {
  if (!cache) return;

  const cacheControl = getCacheControlSetting(userCacheOptions);

  // The padded cache-control to mimic stale-while-revalidate
  const cloneRequest = new Request(changeCacheKey(request.url));

  const response = await cache.match(cloneRequest);
  if (!response) {
    logCacheApiStatus('MISS', cloneRequest);
    return;
  }

  logCacheApiStatus('HIT', cloneRequest, response);

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
  const cloneRequest = new Request(changeCacheKey(request.url), {
    headers: {
      'cache-control': 'max-age=5',
    },
  });
  // The cache-control we want to set on response
  const cacheControlString = generateDefaultCacheControlHeader(
    getCacheControlSetting(cacheControl),
  );

  // CF will override cache-control, so we need to keep a non-modified real-cache-control
  // cache-control is still necessary for mini-oxygen
  response.headers.set('cache-control', 'public, max-age=5');
  response.headers.set('real-cache-control', cacheControlString);
  response.headers.set('cache-put-date', new Date().toUTCString());

  logCacheApiStatus('PUT', cloneRequest, response);
  await cache.put(cloneRequest, response);
}

async function deleteItem(cache: Cache, request: Request) {
  if (!cache) return;

  logCacheApiStatus('DELETE', request);
  await cache.delete(request.url);
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
