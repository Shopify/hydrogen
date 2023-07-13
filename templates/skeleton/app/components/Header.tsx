import {Await, Link, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import type {LayoutProps} from './Layout';

type HeaderProps = Pick<LayoutProps, 'header' | 'cart' | 'isLoggedIn'>;

export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header>
      <div
        style={{
          display: 'flex',
          padding: '0 1rem',
          alignItems: 'center',
          height: 'var(--header-height)',
        }}
      >
        <Link prefetch="intent" to="/">
          <em>{shop.name}</em>
        </Link>{' '}
        <HeaderMenu menu={menu} />
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
      <hr />
    </header>
  );
}

function HeaderMenu({menu}: Pick<HeaderProps['header'], 'menu'>) {
  const [root] = useMatches();
  const publicStoreDomain = root?.data?.publicStoreDomain;
  if (!menu)
    return (
      <mark style={{marginLeft: '3rem'}}>
        Header menu <code>skeleton-header</code> not configured.
      </mark>
    );
  return (
    <nav
      role="navigation"
      style={{
        display: 'flex',
        gridGap: '1rem',
        marginLeft: '3rem',
      }}
    >
      {menu.items.map((item) => {
        if (!item.url) return null;
        const url = item.url.includes(publicStoreDomain)
          ? new URL(item.url).pathname
          : item.url;
        return (
          <Link
            key={item.id}
            prefetch="intent"
            style={{textTransform: 'uppercase'}}
            to={url}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
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
