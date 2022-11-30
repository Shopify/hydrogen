import {type ActionArgs} from '@shopify/hydrogen-remix';
import {
  Localization,
  Product,
  ProductVariant,
  SelectedOptionInput,
  Shop,
} from '@shopify/hydrogen-react/storefront-api-types';
import {useMatches} from '@remix-run/react';
import invariant from 'tiny-invariant';
import {getPrefixFromUrl} from '../utils';

// Types supplied by Hydrogen (hydrogen-remix or maybe even hydrogen-react)
type PageType = 'shop' | 'product';
type AnalyticsQueries = Record<PageType, string>;

// Type for expected variables when making a product query
type ProductPayload = {
  handle: string;
  selectedOptions?: SelectedOptionInput[];
  [key: string]: unknown;
};

type RootPayload = {
  pageType: string;
  [key: string]: unknown;
};

// Function supplied by Hydrogen (hydrogen-remix or maybe even hydrogen-react)
export async function getAnalyticDataByPageType({
  payload,
  storefront,
  queries,
}: {
  payload: unknown;
  storefront: ActionArgs['context']['storefront'];
  queries: AnalyticsQueries;
}) {
  // Default cache time for analytics queries (make this max-age 23 hrs)
  const cache = storefront.CacheLong({
    maxAge: 82800,
    staleWhileRevalidate: 3600,
  });
  let analyticsData: any = {};
  const {pageType} = payload as RootPayload;

  const shopData = await storefront.query<{
    shop: Shop;
    localization: Localization;
  }>(queries['shop'], {
    cache,
  });

  analyticsData = {...shopData};

  if (pageType === 'product') {
    // Do checks for required payload vars
    const {handle, selectedOptions} = payload as unknown as ProductPayload;
    const data = await storefront.query<{
      product: Product & {selectedVariant?: ProductVariant};
    }>(queries[pageType], {
      variables: {
        handle,
        selectedOptions,
      },
      cache,
    });
    // Propagate data.errors check
    analyticsData.product = data.product;
  }
  return analyticsData;
}

// Functions supply by Hydrogen
export function useExtractAnalyticsFromMatches() {
  const matches = useMatches();
  const events: any[] = [];

  matches.forEach((event) => {
    if (event?.data?.analytics) {
      events.push(event.data.analytics);
    }
  });

  return Object.assign({}, ...events);
}

export function getAnalyticsData({
  apiEndpoint,
  eventType,
  payload,
  onSuccess,
  onError,
}: {
  apiEndpoint: string;
  eventType: string;
  payload: unknown;
  onSuccess?: (data: unknown) => void;
  onError?: (err: any) => void;
}) {
  invariant(
    window,
    'getAnalyticsData must be uses inside an useEffect or an event handler',
  );

  const apiEndpointWithPrefix =
    getPrefixFromUrl(window.location.href) + apiEndpoint;

  // Make sure this function only runs on client side
  // * Implement analytic fallbacks (use sendBeacon / fetch / XHR)
  // * Implement leaky bucket before fetch
  fetch(apiEndpointWithPrefix, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventType,
      payload,
      location: window.location.href,
      referrer: document.referrer,
      pageTitle: document.title,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      onSuccess && onSuccess(data);
    })
    .catch((err) => {
      onError && onError(err);
    });
}
