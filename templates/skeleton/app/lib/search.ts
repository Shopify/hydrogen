import type {PredictiveSearchQuery, SearchQuery} from 'storefrontapi.generated';

type ResultWithItems<T> = {
  term: string;
  error?: string;
  result: {total: number; items: T};
};

export type SearchReturn = ResultWithItems<SearchQuery>;
export type PredictiveSearchReturn = ResultWithItems<
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>;

/**
 * A utility function that appends tracking parameters to a URL. Tracking parameters are
 * used internally by shopify to enhance search results and admin dashboards.
 * @param baseUrl - The base URL to which the tracking parameters will be appended.
 * @param trackingParams - The trackingParams returned by the Storefront API.
 * @param params - Any additional query parameters to be appended to the URL.
 * @param term - The search term to be appended to the URL.
 * @returns The URL with the tracking parameters appended.
 * @example
 * ```ts
 * const url = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // Output: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: {
  baseUrl: string;
  trackingParams?: string | null;
  params?: Record<string, string>;
  term: string;
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
