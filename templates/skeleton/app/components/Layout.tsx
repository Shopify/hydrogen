import {Await} from '@remix-run/react';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/Cart';

export type LayoutProps = {
  cart: Promise<CartApiQueryFragment | null>;
  children?: React.ReactNode;
  footer: Promise<FooterQuery>;
  header: HeaderQuery;
  isLoggedIn: boolean;
};

export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <Aside id="cart-aside" heading="Cart">
        <CartAside cart={cart} />
      </Aside>
      <Aside id="search-aside" heading="Search">
        <SearchAside />
      </Aside>
      <Aside id="mobile-menu-aside" heading="MENU">
        <MobileMenuAside menu={header.menu} />
      </Aside>
      <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
      <Suspense>
        <Await resolve={footer}>
          {(footer) => <Footer menu={footer.menu} />}
        </Await>
      </Suspense>
    </>
  );
}

function CartAside({cart}: {cart: LayoutProps['cart']}) {
  return (
    <Suspense fallback={<p>Loading cart ...</p>}>
      <Await resolve={cart}>
        {(cart) => {
          if (!cart) return <p>Cart is empty.</p>;
          return <CartMain cart={cart} layout="aside" />;
        }}
      </Await>
    </Suspense>
  );
}

function SearchAside() {
  return (
    <div>
      <input type="search" placeholder="Search" />
      &nbsp;
      <button>Search</button>
      <p>Search results go here.</p>
    </div>
  );
}

function MobileMenuAside({menu}: {menu: HeaderQuery['menu']}) {
  return <HeaderMenu menu={menu} viewport="mobile" />;
}
