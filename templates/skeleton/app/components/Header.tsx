import {Await, Link, useMatches} from '@remix-run/react';
import {Suspense} from 'react';
import type {LayoutProps} from './Layout';

type HeaderProps = Pick<LayoutProps, 'header' | 'cart' | 'isLoggedIn'>;

type Viewport = 'desktop' | 'mobile';

export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="header">
      <Link prefetch="intent" to="/">
        <em>{shop.name}</em>
      </Link>
      <HeaderMenu menu={menu} viewport="desktop" />
      <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
    </header>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <SearchToggle />
      <Link prefetch="intent" to="/account">
        {isLoggedIn ? 'ACCOUNT' : 'SIGN IN'}
      </Link>
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  return (
    <a className="header-menu-mobile-toggle" href="#mobile-menu-aside">
      MENU
    </a>
  );
}

export function HeaderMenu({
  menu,
  viewport,
}: {
  menu: HeaderProps['header']['menu'];
  viewport: Viewport;
}) {
  const [root] = useMatches();
  const publicStoreDomain = root?.data?.publicStoreDomain;
  const className = `header-menu-${viewport}`;
  if (!menu)
    return (
      <mark className={className}>
        Header menu <code>skeleton-header</code> not configured.
      </mark>
    );
  return (
    <nav className={className} role="navigation">
      {menu.items.map((item) => {
        if (!item.url) return null;
        const url = item.url.includes(publicStoreDomain)
          ? new URL(item.url).pathname
          : item.url;
        return (
          <Link
            key={item.id}
            prefetch="intent"
            className="header-menu-item"
            to={url}
            onClick={(event) => {
              if (viewport === 'mobile') {
                event.preventDefault();
                window.location.href = url;
              }
            }}
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
