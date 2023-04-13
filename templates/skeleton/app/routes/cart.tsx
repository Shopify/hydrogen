import {
  Await,
  useMatches,
  useCatch,
  useRouteError,
  isRouteErrorResponse,
} from '@remix-run/react';
import {Suspense} from 'react';
import {flattenConnection} from '@shopify/hydrogen';
import type {Cart as CartType} from '@shopify/hydrogen/storefront-api-types';
import {type ErrorBoundaryComponent} from '@shopify/remix-oxygen';

export async function action() {
  // @TODO implement cart action
}

export default function CartRoute() {
  const [root] = useMatches();
  return (
    <Suspense fallback="loading">
      <Await
        resolve={root.data?.cart as CartType}
        errorElement={<div>An error occurred</div>}
      >
        {(cart) => {
          const linesCount = Boolean(cart?.lines?.edges?.length || 0);
          if (!linesCount) {
            return (
              <p>Looks like you haven&rsquo;t added anything to your cart.</p>
            );
          }

          const cartLines = cart?.lines ? flattenConnection(cart?.lines) : [];

          return (
            <>
              <h1>Cart</h1>
              <ul>
                {cartLines.map((line) => (
                  <div key={line.id}>
                    <h2>{line?.merchandise?.title}</h2>
                  </div>
                ))}
              </ul>
            </>
          );
        }}
      </Await>
    </Suspense>
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
