import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';

export async function loader ({
  context: {storefront},
}: LoaderFunctionArgs) {
  const data = await storefront.query(FEATURED_COLLECTIONS_QUERY, {
    displayName: 'Network Error Query',
    storefrontApiVersion: '123',
  });

  return json(data);
}

export default function NetworkError() {
  return (<p>Don't expect to reach here</p>)
}

export const FEATURED_COLLECTIONS_QUERY = `#graphql
  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(
      first: 4,
      sortKey: UPDATED_AT
    ) {
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
  }
` as const;
