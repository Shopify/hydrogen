import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import type {Collection as CollectionType} from '@shopify/hydrogen/storefront-api-types';
import {Link} from '@remix-run/react';

export async function loader({params, request, context}: LoaderArgs) {
  const {collectionHandle} = params;

  const {collection} = await context.storefront.query<{
    collection: CollectionType;
  }>(COLLECTION_QUERY, {
    variables: {
      handle: collectionHandle,
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  if (!collection) {
    throw new Response(null, {status: 404});
  }

  return json({collection});
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <>
      <h1>{collection.title}</h1>
      {collection.products.nodes.map((product) => (
        <div key={product.id}>
          <Link to={`/products/${product.handle}`}>{product.title}</Link>
        </div>
      ))}
    </>
  );
}

const COLLECTION_QUERY = `#graphql
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode

  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: 100,
      ) {
        nodes {
          title
          id
          handle
        }
      }
    }

  }
`;
