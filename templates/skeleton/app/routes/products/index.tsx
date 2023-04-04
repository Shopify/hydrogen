import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import type {ProductConnection} from '@shopify/hydrogen/storefront-api-types';
import {Link} from '@remix-run/react';

export async function loader({context}: LoaderArgs) {
  const {products} = await context.storefront.query<{
    products: ProductConnection;
  }>(PRODUCTS_QUERY, {
    variables: {
      count: 200,
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  if (!products) {
    throw new Response(null, {status: 404});
  }

  return json({products});
}

export default function Products() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <>
      <pre>{JSON.stringify(products, null, 2)}</pre>
    </>
  );
}
const PRODUCTS_QUERY = `#graphql
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
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            product {
              handle
              title
            }
          }
        }
      }
    }
  }
`;
