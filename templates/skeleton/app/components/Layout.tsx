import {Await, Link} from '@remix-run/react';
import {Suspense} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {CartMain} from '~/components/Cart';

type LayoutProps = {
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
      <Aside id="cart-aside">
        <CartDrawer cart={cart} />
      </Aside>
      <Aside id="search-aside">
        <input type="search" placeholder="Search" />
        <p>Search results go here.</p>
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

function CartDrawer({cart}: {cart: LayoutProps['cart']}) {
  return (
    <>
      <Link
        to="/cart"
        onClick={() => {
          window.location.href = '/cart';
        }}
      >
        <h2>Cart</h2>
      </Link>
      <hr />
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            if (!cart) return <p>Cart is empty.</p>;
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </>
  );
}

type HeaderProps = Pick<LayoutProps, 'header' | 'cart' | 'isLoggedIn'>;

function Header({header, isLoggedIn, cart}: HeaderProps) {
  if (!header.menu) return <p>Header menu not configured.</p>;
  const {shop, menu} = header;
  return (
    <header>
      <br />
      <div
        style={{
          display: 'flex',
          padding: '0 1rem',
          alignItems: 'center',
        }}
      >
        <Link prefetch="intent" to="/">
          <em>{shop.name}</em>
        </Link>{' '}
        <nav
          role="navigation"
          style={{
            display: 'flex',
            gridGap: '1rem',
            marginLeft: '5rem',
          }}
        >
          <Link to="/collections" prefetch="intent">
            COLLECTIONS
          </Link>
          <Link prefetch="intent" to="/blog">
            BLOG
          </Link>
          <Link prefetch="intent" to="/policies">
            POLICIES
          </Link>
        </nav>
        <nav
          role="navigation"
          style={{
            display: 'flex',
            gridGap: '1rem',
            marginLeft: 'auto',
            alignItems: 'center',
          }}
        >
          <SearchToggle />
          <Link prefetch="intent" to="/account">
            {isLoggedIn ? 'ACCOUNT' : 'SIGN IN'}
          </Link>
          <CartToggle cart={cart} />
        </nav>
      </div>
      <br />
      <hr />
    </header>
  );
}

function SearchToggle() {
  return <a href="#search-aside">SEARCH</a>;
}

function CartBadge({count}: {count: number}) {
  return (
    <a href="#cart-aside">
      CART&nbsp;<mark>{count}</mark>
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        {(cart) => {
          if (!cart) return <CartBadge count={0} />;
          return <CartBadge count={cart.totalQuantity || 0} />;
        }}
      </Await>
    </Suspense>
  );
}

function Footer({menu}: Awaited<LayoutProps['footer']>) {
  if (!menu) return <p>Footer menu not configured.</p>;
  return (
    <footer>
      <hr />
      <section>
        <nav
          role="navigation"
          style={{
            display: 'flex',
            gridGap: '1rem',
          }}
        >
          <Link prefetch="intent" to="/policies/privacy-policy">
            Privacy Policy
          </Link>
          <Link prefetch="intent" to="/policies/terms-of-service">
            Terms of Service
          </Link>
        </nav>
      </section>
    </footer>
  );
}
