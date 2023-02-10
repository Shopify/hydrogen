import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {flattenConnection} from '@shopify/hydrogen';
import type {
  CollectionConnection,
  ProductConnection,
} from '@shopify/hydrogen/storefront-api-types';
import invariant from 'tiny-invariant';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import type {LoaderArgsWithMiddleware} from '@shopify/remix-oxygen';
import {hydrogenContext} from '~/context';

export async function loader({
  context: loaderContext,
}: LoaderArgsWithMiddleware) {
  const {storefront} = loaderContext.get(hydrogenContext);
  return json(await getFeaturedData(storefront));
}

export async function getFeaturedData(
  storefront: LoaderArgs['context']['storefront'],
) {
  const data = await storefront.query<{
    featuredCollections: CollectionConnection;
    featuredProducts: ProductConnection;
  }>(FEATURED_QUERY, {
    variables: {
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return {
    featuredCollections: flattenConnection(data.featuredCollections),
    featuredProducts: flattenConnection(data.featuredProducts),
  };
}

const FEATURED_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query homepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
    featuredProducts: products(first: 12) {
      nodes {
        ...ProductCard
      }
    }
  }
`;
