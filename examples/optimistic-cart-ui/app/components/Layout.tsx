import {Await} from '@remix-run/react';
import {Suspense} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/Cart';

export type LayoutProps = {
  cart: Promise<CartApiQueryFragment | null>;
  children?: React.ReactNode;
  isLoggedIn: boolean;
};

export function Layout({cart, children = null, isLoggedIn}: LayoutProps) {
  return (
    <>
      <CartAside cart={cart} />
      <MobileMenuAside />
      <Header cart={cart} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
    </>
  );
}

function CartAside({cart}: {cart: LayoutProps['cart']}) {
  return (
    <Aside id="cart-aside" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function MobileMenuAside() {
  return (
    <Aside id="mobile-menu-aside" heading="MENU">
      <HeaderMenu viewport="mobile" />
    </Aside>
  );
}
