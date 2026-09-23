import { useState } from "react";
import { Link } from "react-router";

import { useCart } from "~/lib/cart";
import { CART_DRAWER_ID, openCartDrawer } from "~/lib/cart-drawer";
import type { StorefrontShop } from "~/lib/storefront-shop";

import { MobileNav, MobileNavTrigger, type NavCollection } from "./MobileNav";

function cartCountLabel(count: number) {
  return count === 1 ? "Cart (1 item)" : `Cart (${count} items)`;
}

function liveCartCountLabel(count: number) {
  return count === 1 ? "1 item in cart" : `${count} items in cart`;
}

function displayCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function Header({
  navCollections,
  shopInfo,
}: {
  navCollections: NavCollection[];
  shopInfo: StorefrontShop;
}) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const logo = shopInfo.logo;

  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pe-3 md:max-w-48 md:flex-none md:pe-0">
          <div className="-ms-2 hidden shrink-0 max-md:block" data-hamburger-wrapper>
            <MobileNavTrigger />
          </div>
          <Link
            to="/"
            aria-label={shopInfo.name}
            title={shopInfo.name}
            className="text-on-surface focus-visible:outline-accent inline-flex max-w-48 min-w-0 items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {logo && failedLogoUrl !== logo.url ? (
              <img
                src={logo.url}
                alt={logo.altText ?? shopInfo.name}
                width={logo.width ?? undefined}
                height={logo.height ?? undefined}
                className="h-auto max-h-10 w-auto max-w-full object-contain"
                onError={() => setFailedLogoUrl(logo.url)}
              />
            ) : (
              <span className="line-clamp-2 leading-tight wrap-anywhere">{shopInfo.name}</span>
            )}
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 overflow-x-auto md:flex"
          data-desktop-nav
        >
          {navCollections.map((collection) => (
            <Link
              key={collection.handle}
              to={`/collections/${collection.handle}`}
              className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            >
              {collection.title}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0">
          <Link
            to="/search"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Search"
          >
            <img src="/icons/icon-search.svg" alt="" className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to="/cart"
            className="text-on-surface focus-visible:outline-accent relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97]"
            aria-label={cartCountLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={(event) => {
              const isModifiedClick =
                event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
              if (event.button !== 0 || isModifiedClick) return;
              if (!(document.getElementById(CART_DRAWER_ID) instanceof HTMLDialogElement)) return;
              event.preventDefault();
              openCartDrawer();
            }}
          >
            <span
              className="relative inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <img src="/icons/icon-cart.svg" alt="" className="size-5" />
              {totalQuantity > 0 ? (
                <span className="bg-interactive text-interactive-text absolute end-0 top-0 flex h-5 min-w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-medium">
                  {displayCount(totalQuantity)}
                </span>
              ) : null}
            </span>
          </Link>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {liveCartCountLabel(totalQuantity)}
          </span>
        </div>
      </div>
      <MobileNav collections={navCollections} />
    </header>
  );
}
