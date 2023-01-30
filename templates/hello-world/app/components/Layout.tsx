import {Suspense} from 'react';
import type {Cart} from '@shopify/storefront-kit-react/storefront-api-types';
import {Await} from '@remix-run/react';

interface LayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string | null;
  cart?: Promise<{cart: Cart}> | null;
}

export function Layout({children, cart, title, description}: LayoutProps) {
  return (
    <div className="Layout">
      <CartCount cart={cart} />
      <h1>{title}</h1>
      <h2>{description}</h2>
      {children}
    </div>
  );
}

export function CartCount({cart}: {cart: LayoutProps['cart']}) {
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
        <Await resolve={cart}>
          {(data) => <span>{data?.cart?.totalQuantity || 0}</span>}
        </Await>
      </Suspense>
    </div>
  );
}
