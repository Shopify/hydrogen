import {
  useLoaderData,
  Link,
  useRouteError,
  isRouteErrorResponse,
  useCatch,
} from '@remix-run/react';
import {
  json,
  type LoaderArgs,
  type ErrorBoundaryComponent,
} from '@shopify/remix-oxygen';
import {type CollectionConnection} from '@shopify/hydrogen/storefront-api-types';
import {Image} from '@shopify/hydrogen';

export async function loader({context}: LoaderArgs) {
  const {collectionConnection} = await context.storefront.query<{
    collectionConnection: CollectionConnection;
  }>(COLLECTIONS_QUERY, {
    variables: {
      country: context.storefront.i18n?.country,
      language: context.storefront.i18n?.language,
    },
  });

  return json({collectionConnection});
}

export default function Collections() {
  const {collectionConnection} = useLoaderData<typeof loader>();

  return (
    <>
      {collectionConnection.nodes.map((collection, collectionIndex) => {
        return (
          <div key={collection.id}>
            <Link to={`/collections/${collection.handle}`}>
              <h3>{collection.title}</h3>
            </Link>
            {collection.image && (
              <Image
                data={collection.image}
                loading={collectionIndex === 0 ? 'eager' : undefined}
              />
            )}
          </div>
        );
      })}
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

const COLLECTIONS_QUERY = `#graphql
  query collection_index(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language)
  {
    collectionConnection: collections(first: 250) {
      nodes {
        id
        title
        handle
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
`;
