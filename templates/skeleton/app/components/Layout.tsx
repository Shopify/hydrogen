import {Link} from '@remix-run/react';
import {type StoreLayoutQuery} from 'storefrontapi.generated';

type LayoutProps = {
  children?: React.ReactNode;
  shop: StoreLayoutQuery['shop'];
};

export function Layout({children = null, shop}: LayoutProps) {
  return (
    <>
      <Header name={shop.name} />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function Header({name}: LayoutProps['shop']) {
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
          <em>{name}</em>
        </Link>
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
          <input type="search" placeholder="Search" />
          <Link prefetch="intent" to="/account">
            ACCOUNT
          </Link>
          <Link prefetch="intent" to="/cart">
            CART
          </Link>
        </nav>
      </div>
      <br />
      <hr />
    </header>
  );
}

function Footer() {
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
