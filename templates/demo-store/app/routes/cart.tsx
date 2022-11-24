import {CartLoading, Cart} from '~/components';
import {Await, useMatches} from '@remix-run/react';
import {Suspense} from 'react';

export default function CartRoute() {
  const [root] = useMatches();
  // @todo: finish on a separate PR
  return (
    <div className="grid w-full gap-8 p-6 py-8 md:p-8 lg:p-12 justify-items-start">
      <Suspense fallback={<CartLoading />}>
        <Await resolve={root.data.cart}>
          {(cart) => <Cart layout="page" cart={cart} />}
        </Await>
      </Suspense>
    </div>
  );
}
