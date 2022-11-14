import {json, type LoaderArgs} from '@shopify/hydrogen-remix';
import {flattenConnection} from '@shopify/hydrogen-react';
import type {
  CollectionConnection,
  ProductConnection,
} from '@shopify/hydrogen-react/storefront-api-types';
import invariant from 'tiny-invariant';
import {PRODUCT_CARD_FRAGMENT} from '~/data';
import {getLocalizationFromLang} from '~/lib/utils';

export async function loader({params, context: {storefront}}: LoaderArgs) {
  return json(await getFeaturedData(storefront, params));
}

export async function getFeaturedData(
  storefront: LoaderArgs['context']['storefront'],
  params: LoaderArgs['params'],
) {
  const {language, country} = getLocalizationFromLang(params.lang);
  const data = await storefront.query<{
    featuredCollections: CollectionConnection;
    featuredProducts: ProductConnection;
  }>({
    query: FEATURED_QUERY,
    variables: {language, country},
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
