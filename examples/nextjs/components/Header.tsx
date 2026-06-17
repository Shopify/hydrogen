"use client";

import type { HeaderCollection } from "@shared/header";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart";
import { CART_DRAWER_ID, openCartDrawer, supportsDialogCommands } from "@/lib/cart-drawer";

// React types do not include Invoker Commands yet: https://github.com/facebook/react/issues/32478
const openCartCommandAttributes = {
  command: "show-modal",
  commandfor: CART_DRAWER_ID,
};

export function Header({ collections }: { collections: HeaderCollection[] }) {
  const totalQuantity = useCart((s) => s.data.totalQuantity);
  const [hasHydrated, setHasHydrated] = useState(false);
  const cartLabel =
    totalQuantity === 0
      ? "Cart, empty"
      : `Cart, ${totalQuantity > 99 ? "99 or more" : totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`;
  const cartBadge = totalQuantity > 0 && (
    <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[11px] font-bold text-white">
      {totalQuantity > 99 ? "99+" : totalQuantity}
    </span>
  );

  useEffect(() => setHasHydrated(true), []);

  return (
    <header className="border-b border-black/10">
      <div className="mx-auto grid h-16 max-w-[1480px] grid-cols-3 items-center px-6">
        <nav className="flex items-center gap-6 text-sm font-semibold">
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/collections/${collection.handle}`}
              className="hover:opacity-60"
            >
              {collection.title}
            </Link>
          ))}
          <Link href="/collections" className="hover:opacity-60">
            Collections
          </Link>
          <Link href="/blogs/news" className="hover:opacity-60">
            News
          </Link>
        </nav>
        <Link href="/" className="justify-self-center text-lg font-black tracking-tight">
          MOCK.SHOP
        </Link>
        <div className="flex items-center justify-end gap-5">
          <form method="get" action="/search" role="search" className="flex items-center gap-1">
            <input
              type="search"
              name="q"
              aria-label="Search products"
              placeholder="Search"
              className="w-28 rounded border border-black/15 px-2 py-1 text-sm transition-[width] focus:w-44 focus:outline-none"
            />
            <button type="submit" aria-label="Search" className="hover:opacity-60">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>
          <Link href="/" aria-label="Account" className="hover:opacity-60">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </Link>
          {hasHydrated ? (
            <button
              type="button"
              aria-label={cartLabel}
              aria-controls={CART_DRAWER_ID}
              aria-haspopup="dialog"
              {...openCartCommandAttributes}
              onClick={() => {
                if (!supportsDialogCommands()) openCartDrawer();
              }}
              className="relative hover:opacity-60"
            >
              <CartIcon />
              {cartBadge}
            </button>
          ) : (
            <Link href="/cart" aria-label={cartLabel} className="relative hover:opacity-60">
              <CartIcon />
              {cartBadge}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden={true}
    >
      <path d="M5 7h14l-1.5 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
