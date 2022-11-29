import {type LoaderArgs, json} from '@shopify/hydrogen-remix';
import {flattenConnection} from '@shopify/hydrogen-react';
import {
  Collection,
  Product,
  ProductConnection,
  ProductVariant,
  SelectedOptionInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const url = new URL(request.url);

  const data = await getAnalyticDataByPageType({
    pageType: 'product',
    payload: {} as Product,
    storefront,
    queries: {} as AnalyticsQueries,
  });

  const data2 = await getAnalyticDataByPageType({
    pageType: 'collection',
    payload: {} as Collection,
    storefront,
    queries: {} as AnalyticsQueries,
  });

  const data3 = await getAnalyticDataByPageType({
    pageType: 'home',
    payload: null,
    storefront,
    queries: {} as AnalyticsQueries,
  });

  return json({
    ga: ['event', 'page_view'],
  });
}

// Types supplied by Hydrogen (hydrogen-remix or maybe even hydrogen-react)
type PageType = 'home' | 'collection' | 'product';
type AnalyticsQueries = Record<PageType, string>;

// Type for expected variables when making a product query
type ProductPayload = {
  handle: string;
  selectedOptions?: SelectedOptionInput[];
  [key: string]: unknown;
};

type PageToPayloadMap = {
  product: Product;
  collection: Collection;
  home: null;
};

// Function supplied by Hydrogen (hydrogen-remix or maybe even hydrogen-react)
async function getAnalyticDataByPageType<PageTypeGeneric extends PageType>({
  pageType,
  payload,
  storefront,
  queries,
}: {
  pageType: PageTypeGeneric;
  payload: PageToPayloadMap[PageTypeGeneric];
  storefront: LoaderArgs['context']['storefront'];
  queries: AnalyticsQueries;
}): Promise<PageToPayloadMap[PageTypeGeneric]> {
  // Default cache time for analytics queries
  const cache = storefront.CacheLong();

  if (pageType === 'product') {
    // Do checks for required payload vars

    // unfortunately, TS itself seems limited in being able to infer this, so we have to cast it ourselves - instead of being able to do the following:
    // const {handle, selectedOptions} = payload;
    const {handle, selectedOptions} = payload as PageToPayloadMap['product'];

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
    // 'as any' is required for TS to work here, it seems. It's a limitation of TS itself
    return data.product as any;
  }
  // 'as any' is required for TS to work here, it seems. It's a limitation of TS itself
  return {} as any;
}

// Queries supplied by developer
const PRODUCT_QUERY = `#graphql
  fragment ProductVariantFragment on ProductVariant {
    id
    price {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
  query ProductAnalytics(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }
      variants(first: 1) {
        nodes {
          ...ProductVariantFragment
        }
      }
    }
  }
`;

const ANALYTICS_QUERIES = {
  product: PRODUCT_QUERY,
};

export default function ServerAnalyticsRoute() {
  // We can also handle <noscript> analytics here
  return null;
}
