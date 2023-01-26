import {Suspense} from 'react';
import {useMatches, Await} from '@remix-run/react';

export function CartCount() {
  const [root] = useMatches();
  const cartPromise = root?.data?.cartPromise;
  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        fontSize: 14,
        display: 'flex',
      }}
    >
      <span>CART</span>
      &nbsp;
      <Suspense fallback={<span>0</span>}>
        <Await resolve={cartPromise}>
          {(data) => <span>{data?.cart?.totalQuantity || 0}</span>}
        </Await>
      </Suspense>
    </div>
  );
}
