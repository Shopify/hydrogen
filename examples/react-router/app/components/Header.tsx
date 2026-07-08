import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useCart } from "~/lib/cart";
import { openCartDrawer, CART_DRAWER_ID } from "~/lib/cart-drawer";
import { content, cartIconLabel, cartItemCount } from "~/lib/content";

import { PredictiveSearchModal } from "./PredictiveSearchModal";

/** Maps a header nav item to its route. "Collections" -> the collections
 * index; the category items -> their collection PLP. */
const navItemHref: Record<(typeof content.header.navItems)[number], string> = {
  Collections: "/collections",
  Men: "/collections/men",
  Women: "/collections/women",
  Accessories: "/collections/accessories",
};

/**
 * Site header — shared chrome (`navbar.md`, `notes/cart.md`,
 * `notes/predictive-search.md`). Server-rendered nav. The cart trigger opens
 * the drawer with a JS `showModal()` call; the footer `/cart` link is the no-JS
 * cart fallback (F4). The search trigger is a real `/search` link that hydrates
 * into the predictive-search modal. The mobile nav is a `<dialog>` with an
 * always-rendered fallback link list.
 *
 * `accountEnabled`/`isLoggedIn` are server-resolved booleans from the root
 * loader (which re-runs on every route change). The account link is gated on
 * `accountEnabled` first: on mock.shop the customer account handlers are not
 * registered, so `/account/login` has no route and would 404 — render nothing.
 */
export function Header({
  accountEnabled,
  isLoggedIn,
}: {
  accountEnabled: boolean;
  isLoggedIn: boolean;
}) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);

  const [hasHydrated, setHasHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => setHasHydrated(true), []);

  const cartLabel = cartIconLabel(totalQuantity);
  const countDisplay = totalQuantity > 99 ? "99+" : String(totalQuantity);

  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex items-center gap-2">
          <div className="-ms-2 hidden max-md:block">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={content.header.menu}
            >
              <img
                src="/icons/icon-menu.svg"
                width="20"
                height="20"
                alt=""
                className="size-5"
                aria-hidden="true"
              />
            </button>
          </div>

          <Link
            to="/"
            className="text-on-surface focus-visible:outline-accent inline-flex items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            CORE
          </Link>
        </div>

        <nav
          aria-label={content.header.navigation}
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 md:flex"
        >
          {content.header.navItems.map((item) => (
            <Link
              key={item}
              to={navItemHref[item]}
              className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-0">
          {hasHydrated ? (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={content.general.search}
              data-testid="search-modal-trigger"
            >
              <img
                src="/icons/icon-search.svg"
                width="20"
                height="20"
                alt=""
                className="size-5"
                aria-hidden="true"
              />
            </button>
          ) : (
            <a
              href="/search"
              className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={content.general.search}
              data-testid="search-modal-trigger"
            >
              <img
                src="/icons/icon-search.svg"
                width="20"
                height="20"
                alt=""
                className="size-5"
                aria-hidden="true"
              />
            </a>
          )}
          <noscript>
            <form action="/search" method="get" role="search" className="sr-only">
              <label htmlFor="header-search-q">{content.general.search}</label>
              <input id="header-search-q" name="q" type="search" />
              <button type="submit">{content.search.submit}</button>
            </form>
          </noscript>

          {accountEnabled ? (
            <Link
              to={isLoggedIn ? "/account" : "/account/login"}
              reloadDocument={!isLoggedIn}
              className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label={isLoggedIn ? content.general.account : "Log in"}
            >
              <img
                src="/icons/icon-user.svg"
                width="20"
                height="20"
                alt=""
                className="size-5"
                aria-hidden="true"
              />
            </Link>
          ) : null}

          {/* Cart trigger (hydrogen-cart-drawer). `onClick` calls showModal()
              to open the `<dialog>` drawer after hydration. The footer `/cart`
              link remains the no-JS cart surface (F4). */}
          <button
            type="button"
            onClick={openCartDrawer}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            className="text-on-surface focus-visible:outline-accent relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-transparent p-0 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97]"
            aria-label={cartLabel}
          >
            <CartIcon count={totalQuantity} display={countDisplay} />
          </button>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {cartItemCount(totalQuantity)}
          </span>
        </div>
      </div>

      <MobileNavDialog open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <PredictiveSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function CartIcon({ count, display }: { count: number; display: string }) {
  return (
    <span
      className="relative inline-flex size-5 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <img src="/icons/icon-cart.svg" width="20" height="20" alt="" className="size-5" />
      {count > 0 ? (
        <span className="bg-interactive text-interactive-text absolute end-0 top-0 flex h-5 w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-medium">
          {display}
        </span>
      ) : null}
    </span>
  );
}

function MobileNavDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id="mobile-nav-drawer"
      className="drawer-left bg-surface text-on-surface"
      aria-labelledby="mobile-nav-title"
      onClose={onClose}
    >
      <div className="flex h-full flex-col">
        <div className="relative flex min-h-[52px] shrink-0 items-center px-4 py-1">
          <span
            className="text-on-surface pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-medium"
            id="mobile-nav-title"
            aria-live="polite"
          >
            {content.header.mobileNavigation}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="button-icon focus-visible:outline-accent ms-auto inline-flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={content.general.close}
          >
            <img
              src="/icons/icon-x.svg"
              width="20"
              height="20"
              alt=""
              className="size-5"
              aria-hidden="true"
            />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <nav aria-label={content.header.mobileNavigation}>
            <ul role="list" className="flex flex-col">
              {content.header.navItems.map((item) => (
                <li key={item}>
                  <Link
                    to={navItemHref[item]}
                    onClick={onClose}
                    className="text-on-surface flex items-center rounded-sm py-3 text-xl font-normal no-underline hover:opacity-70 motion-safe:transition-opacity"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </dialog>
  );
}
