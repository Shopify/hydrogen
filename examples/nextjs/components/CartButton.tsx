"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart";
import { CART_DRAWER_ID, openCartDrawer, supportsDialogCommands } from "@/lib/cart-drawer";

// React types do not include Invoker Commands yet: https://github.com/facebook/react/issues/32478
const openCartCommandAttributes = {
  command: "show-modal",
  commandfor: CART_DRAWER_ID,
};

export function CartButton() {
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

  if (!hasHydrated) {
    return (
      <Link href="/cart" aria-label={cartLabel} className="relative hover:opacity-60">
        <CartIcon />
        {cartBadge}
      </Link>
    );
  }

  return (
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
