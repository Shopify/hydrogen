/**
 * Returns the empty state of a predictive search result to reset the search state.
 */
export function getEmptyPredictiveSearchResult() {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  };
}

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by Shopify to enhance search results and admin dashboards.
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 * @param {UrlWithTrackingParams}
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}) {
  let search = new URLSearchParams({
    ...extraParams,
    q: encodeURIComponent(term),
  }).toString();

  if (trackingParams) {
    search = `${search}&${trackingParams}`;
  }

  return `${baseUrl}?${search}`;
}

/**
 * @typedef {{
 *   type: Type;
 *   term: string;
 *   error?: string;
 *   result: {total: number; items: Items};
 * }} ResultWithItems
 * @template {'predictive' | 'regular'} Type
 * @template Items
 */
/**
 * @typedef {ResultWithItems<
 *   'regular',
 *   RegularSearchQuery
 * >} RegularSearchReturn
 */
/**
 * @typedef {ResultWithItems<
 *   'predictive',
 *   NonNullable<PredictiveSearchQuery['predictiveSearch']>
 * >} PredictiveSearchReturn
 */
/**
 * @typedef {Object} UrlWithTrackingParams
 * @property {string} baseUrl The base URL to which the tracking parameters will be appended.
 * @property {string|null} [trackingParams] The trackingParams returned by the Storefront API.
 * @property {Record<string,string>} [params] Any additional query parameters to be appended to the URL.
 * @property {string} term The search term to be appended to the URL.
 */

/** @typedef {import('storefrontapi.generated').PredictiveSearchQuery} PredictiveSearchQuery */
/** @typedef {import('storefrontapi.generated').RegularSearchQuery} RegularSearchQuery */
