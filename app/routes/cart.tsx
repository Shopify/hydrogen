import {Suspense} from 'react';
import {Await, useMatches} from '@remix-run/react';

export default function Cart() {
  const [root] = useMatches();
  return (
    <>
      <h1>Todo: Build a cart here</h1>
      <Suspense fallback={'Loading cart...'}>
        <Await resolve={root?.data?.cart}>
          {(cart) => <pre>{JSON.stringify(cart, null, 2)}</pre>}
        </Await>
      </Suspense>
    </>
  );
}
