import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import {flattenConnection} from '@shopify/hydrogen';
import type {Cart as CartType} from '@shopify/hydrogen/storefront-api-types';

export async function action() {
  // @TODO implement cart action
}

export default function CartRoute() {
  const [root] = useMatches();
  return (
    <Suspense fallback="loading">
      <Await resolve={root.data?.cart as CartType}>
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
