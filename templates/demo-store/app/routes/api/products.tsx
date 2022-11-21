import {type LoaderArgs, json} from '@shopify/hydrogen-remix';
import {flattenConnection} from '@shopify/hydrogen-react';
import {ProductConnection} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';

/**
 * Fetch a given set of products from the storefront API
 * @see: https://shopify.dev/api/storefront/2023-01/queries/products
 * @param count
 * @param query
 * @param reverse
 * @param sortKey
 * @returns Product[]
 */
export async function loader({request, context: {storefront}}: LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const sortKey = searchParams.get('sortKey') ?? 'BEST_SELLING';
  const query = searchParams.get('query') ?? '';

  let reverse = false;
  try {
    const _reverse = searchParams.get('reverse');
    if (_reverse === 'true') {
      reverse = true;
    }
  } catch (_) {
    // noop
  }

  let count = 4;
  try {
    const _count = searchParams.get('count');
    if (typeof _count === 'string') {
      count = parseInt(_count);
    }
  } catch (_) {
    // noop
  }

  const {products} = await storefront.query<{
    products: ProductConnection;
  }>(PRODUCTS_QUERY, {
    variables: {
      count,
      query,
      reverse,
      sortKey,
    },
    cache: storefront.CacheLong(),
  });

  invariant(products, 'No data returned from top products query');

  return json({
    products: flattenConnection(products),
  });
}

const PRODUCTS_QUERY = `#graphql
  fragment ProductCard on Product {
    id
    title
    publishedAt
    handle
    variants(first: 1) {
      nodes {
        id
        image {
          url
          altText
          width
          height
        }
        price: priceV2 {
          amount
          currencyCode
        }
        compareAtPrice: compareAtPriceV2 {
          amount
          currencyCode
        }
        product {
          title
          handle
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  query (
    $query: String
    $count: Int
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
    $sortKey: ProductSortKeys
  ) @inContext(country: $country, language: $language) {
    products(first: $count, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes {
        ...ProductCard
      }
    }
  }
`;

// no-op
export default function ProductsApiRoute() {
  return null;
}
