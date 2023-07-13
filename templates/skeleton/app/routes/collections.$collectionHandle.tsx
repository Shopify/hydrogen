import {
  json,
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {
  useLoaderData,
  Link,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';
import type {Collection as CollectionType} from '@shopify/hydrogen/storefront-api-types';

export async function loader({params, context}: LoaderArgs) {
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

export const ErrorBoundaryV1: ErrorBoundaryComponent = ({error}) => {
  console.error(error);

  return <div>There was an error.</div>;
};

export function CatchBoundary() {
  const caught = useCatch();
  console.error(caught);

  return (
    <div>
      There was an error. Status: {caught.status}. Message:{' '}
      {caught.data?.message}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error((error as Error).message);
    return <div>Thrown Error</div>;
  }
}

const COLLECTION_QUERY = `#graphql
  query collection_details(
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
