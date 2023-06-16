import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';

import type {FeaturedItemsQuery} from 'storefrontapi.generated';
import {
  PRODUCT_CARD_FRAGMENT,
  FEATURED_COLLECTION_FRAGMENT,
} from '~/data/fragments';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const queryParams = new URL(request.url).searchParams;
  const productsCount = Number(queryParams.get('productsCount') ?? 12);
  const collectionsCount = Number(queryParams.get('collectionsCount') ?? 3);
  const data = await getFeaturedItems(storefront, {
    productsCount,
    collectionsCount,
  });
  return json(data);
}

export async function getFeaturedItems(
  storefront: LoaderArgs['context']['storefront'],
  variables: {productsCount?: number; collectionsCount?: number} = {
    productsCount: 12,
    collectionsCount: 3,
  },
): Promise<FeaturedItemsQuery> {
  // TODO: cache this query aggresively
  const data = await storefront.query(FEATURED_ITEMS_QUERY, {
    variables: {
      country: storefront.i18n.country,
      language: storefront.i18n.language,
      ...variables,
    },
  });

  invariant(data, 'No featured items data returned from Shopify API');

  return data;
}

export const FEATURED_ITEMS_QUERY = `#graphql
  query FeaturedItems(
    $country: CountryCode
    $language: LanguageCode
    $productsCount: Int = 12
    $collectionsCount: Int = 3
  ) @inContext(country: $country, language: $language) {
    featuredCollections: collections(first: $collectionsCount, sortKey: UPDATED_AT) {
      nodes {
        ...FeaturedCollectionDetails
      }
    }
    featuredProducts: products(first: $productsCount) {
      nodes {
        ...ProductCard
      }
    }
  }

  ${PRODUCT_CARD_FRAGMENT}
  ${FEATURED_COLLECTION_FRAGMENT}
` as const;
