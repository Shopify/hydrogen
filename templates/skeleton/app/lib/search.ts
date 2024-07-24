import type {Maybe} from '@shopify/hydrogen/storefront-api-types';


/**
 * Predictive search fetcher
 */
async function predictiveSeach({term, request, context}: Pick<ActionFunctionArgs, 'request' | 'context'> & {term: string}) {
  const {storefront} = context;
  const formData = await request.formData();
  const limit = Number(formData.get('limit') || 10);

  if (!term) {
    throw new Error('No search term provided');
  }

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {predictiveSearch: items, errors} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    },
  );

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned');
  }

  const total = Object.values(items).reduce(
    (acc, {length}) => acc + length,
    0,
  );

  return json({term, result: {items, total}, error: null});
}

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
  params,
  term,
}: {
  baseUrl: string;
  trackingParams: Maybe<string> | undefined;
  params?: Record<string, string>;
  term: string;
}) {
  const p = new URLSearchParams(params || {});

  if (typeof term === 'string') {
    p.append('q', encodeURIComponent(term));
  }

  let url = `${baseUrl}?${p.toString()}`;

  if (trackingParams) {
    if (p.size > 0) {
      url = `${url}${trackingParams}`;
    } else {
      url = `${url}?${trackingParams}`;
    }
  }

  return url;
}
