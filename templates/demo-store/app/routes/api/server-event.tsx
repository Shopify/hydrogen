import {type LoaderArgs, json} from '@shopify/hydrogen-remix';
import {flattenConnection} from '@shopify/hydrogen-react';
import {
  Product,
  ProductConnection,
  ProductVariant,
  SelectedOptionInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const url = new URL(request.url);

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

// Function supplied by Hydrogen (hydrogen-remix or maybe even hydrogen-react)
async function getAnalyticDataByPageType({
  pageType,
  payload,
  storefront,
  queries,
}: {
  pageType: string;
  payload: unknown;
  storefront: LoaderArgs['context']['storefront'];
  queries: AnalyticsQueries;
}) {
  // Default cache time for analytics queries
  const cache = storefront.CacheLong();

  if (pageType === 'product') {
    // Do checks for required payload vars
    const {handle, selectedOptions} = payload as ProductPayload;
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
    return data.product;
  }
  return {};
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
