import {Await, Link} from '@remix-run/react';
import {Suspense} from 'react';
import type {
  CartQuery,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';

type LayoutProps = {
  cart: Promise<CartQuery> | Promise<object>;
  children?: React.ReactNode;
  footer: Promise<FooterQuery>;
  header: HeaderQuery;
  isLoggedIn: boolean;
};

export function Layout({
  children = null,
  header,
  footer,
  cart,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <Aside id="cart-aside">
        <h1>Cart</h1>
        <p>Cart contents go here.</p>
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
        {(result) => <CartBadge count={result?.cart?.totalQuantity || 0} />}
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
