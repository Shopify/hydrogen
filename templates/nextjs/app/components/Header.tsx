"use client";

import Link from "next/link";

import { useCart } from "../lib/cart";
import { CART_DRAWER_ID, openCartDrawer } from "../lib/cart-drawer";
import { MobileNav, MobileNavTrigger, type NavCollection } from "./MobileNav";

function cartLabel(count: number) {
  return count === 1 ? "Cart (1 item)" : `Cart (${count} items)`;
}

function countLabel(count: number) {
  return count === 1 ? "1 item in cart" : `${count} items in cart`;
}

function displayCount(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function Header({ collections }: { collections: NavCollection[] }) {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const badge = displayCount(totalQuantity);

  return (
    <header className="border-border bg-surface sticky top-0 z-40 border-b">
      <div
        className="max-w-page px-margin mx-auto flex h-16 w-full items-center justify-between"
        data-header-nav-group
      >
        <div className="flex items-center gap-2">
          <div className="-ms-2 hidden max-md:block">
            <MobileNavTrigger />
          </div>
          <Link
            href="/"
            className="text-on-surface focus-visible:outline-accent inline-flex items-center rounded-sm text-lg font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            CORE
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className="mx-8 hidden min-w-0 flex-1 items-center gap-8 md:flex"
          data-desktop-nav
        >
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/collections/${collection.handle}`}
              className="text-on-surface focus-visible:outline-accent shrink-0 rounded-sm text-sm font-normal whitespace-nowrap no-underline hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            >
              {collection.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-0">
          <Link
            href="/search"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center gap-2 rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Search"
          >
            <img src="/icons/icon-search.svg" alt="" className="size-5" aria-hidden="true" />
          </Link>
          <a
            href="#"
            className="text-on-surface focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-opacity"
            aria-label="Account"
          >
            <img src="/icons/icon-user.svg" alt="" className="size-5" aria-hidden="true" />
          </a>
          <button
            type="button"
            commandfor={CART_DRAWER_ID}
            command="show-modal"
            className="text-on-surface focus-visible:outline-accent relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-transparent p-0 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition motion-safe:active:scale-[0.97]"
            aria-label={cartLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={openCartDrawer}
          >
            <span
              className="relative inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <img src="/icons/icon-cart.svg" alt="" className="size-5" />
              {badge ? (
                <span
                  className="bg-interactive text-interactive-text absolute end-0 top-0 flex h-5 min-w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-xs font-medium"
                  data-testid="cart-count"
                >
                  {badge}
                </span>
              ) : null}
            </span>
          </button>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {countLabel(totalQuantity)}
          </span>
        </div>
      </div>
      <MobileNav collections={collections} />
    </header>
  );
}
