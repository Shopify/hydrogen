import { AnalyticsEvent, type CartData, type CartPending } from "@shopify/hydrogen";
import { Suspense } from "react";
import { Await, NavLink } from "react-router";

import { useAside } from "~/components/Aside";
import { toAnalyticsCart, useAnalytics, useAnalyticsCarts } from "~/lib/analytics";
import { useCart } from "~/lib/cart";
import type { HeaderQuery } from "~/lib/fragments";

interface HeaderProps {
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = "desktop" | "mobile";

export function Header({ header, isLoggedIn, publicStoreDomain }: HeaderProps) {
  const { shop, menu } = header;
  return (
    <header className="header">
      <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
        <strong>{shop.name}</strong>
      </NavLink>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
      <HeaderCtas isLoggedIn={isLoggedIn} />
    </header>
  );
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps["header"]["menu"];
  primaryDomainUrl: HeaderProps["header"]["shop"]["primaryDomain"]["url"];
  viewport: Viewport;
  publicStoreDomain: HeaderProps["publicStoreDomain"];
}) {
  const className = `header-menu-${viewport}`;
  const { close } = useAside();

  return (
    <nav className={className} role="navigation">
      {viewport === "mobile" && (
        <NavLink end onClick={close} prefetch="intent" style={activeLinkStyle} to="/">
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const url =
          item.url.includes("myshopify.com") ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        return (
          <NavLink
            className="header-menu-item"
            end
            key={item.id}
            onClick={close}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({ isLoggedIn }: Pick<HeaderProps, "isLoggedIn">) {
  return (
    <nav className="header-ctas" role="navigation">
      <HeaderMenuMobileToggle />
      <NavLink prefetch="intent" to="/account" style={activeLinkStyle}>
        <Suspense fallback="Sign in">
          <Await resolve={isLoggedIn} errorElement="Sign in">
            {(isLoggedIn) => (isLoggedIn ? "Account" : "Sign in")}
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle />
      <CartToggle />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const { open } = useAside();
  return (
    <button className="header-menu-mobile-toggle reset" onClick={() => open("mobile")}>
      <h3>☰</h3>
    </button>
  );
}

function SearchToggle() {
  const { open } = useAside();
  return (
    <button className="reset" onClick={() => open("search")}>
      Search
    </button>
  );
}

function CartBadge({ cart, pending }: { cart: CartData; pending: CartPending }) {
  const { open } = useAside();
  const analytics = useAnalytics();
  const { prevCart } = useAnalyticsCarts();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open("cart");
        if (!analytics) return;
        const analyticsCart = toAnalyticsCart({ ...cart, pending });
        if (!analyticsCart) return;

        analytics.bus.publish(AnalyticsEvent.CART_VIEWED, {
          cart: analyticsCart,
          prevCart,
          shop: analytics.shop,
          url: analytics.url,
        });
      }}
    >
      Cart <span aria-label={`(items: ${cart.totalQuantity})`}>{cart.totalQuantity}</span>
    </a>
  );
}

function CartToggle() {
  const cart = useCart((cart) => cart);
  return <CartBadge cart={cart.data} pending={cart.pending} />;
}

const FALLBACK_HEADER_MENU = {
  id: "gid://shopify/Menu/199655587896",
  items: [
    {
      id: "gid://shopify/MenuItem/461609500728",
      resourceId: null,
      tags: [],
      title: "Collections",
      type: "HTTP",
      url: "/collections",
      items: [],
    },
    {
      id: "gid://shopify/MenuItem/461609533496",
      resourceId: null,
      tags: [],
      title: "Blog",
      type: "HTTP",
      url: "/blogs/journal",
      items: [],
    },
    {
      id: "gid://shopify/MenuItem/461609566264",
      resourceId: null,
      tags: [],
      title: "Policies",
      type: "HTTP",
      url: "/policies",
      items: [],
    },
    {
      id: "gid://shopify/MenuItem/461609599032",
      resourceId: "gid://shopify/Page/92591030328",
      tags: [],
      title: "About",
      type: "PAGE",
      url: "/pages/about",
      items: [],
    },
  ],
};

function activeLinkStyle({ isActive, isPending }: { isActive: boolean; isPending: boolean }) {
  return {
    fontWeight: isActive ? "bold" : undefined,
    color: isPending ? "grey" : "black",
  };
}
