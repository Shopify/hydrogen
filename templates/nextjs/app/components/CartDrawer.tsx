"use client";

import { useEffect, useRef } from "react";

import { useCart } from "../lib/cart";
import { CART_DRAWER_ID, closeCartDrawer } from "../lib/cart-drawer";
import { publishCartViewed } from "./AnalyticsTrackers";
import { CartContents, CartSummary } from "./CartPageClient";

function displayCount(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export function CartDrawer() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cart = useCart((state) => state.data);
  const totalQuantity = cart.totalQuantity;
  const badge = displayCount(totalQuantity);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onToggle = () => {
      if (dialog.open) publishCartViewed(cart);
    };

    dialog.addEventListener("toggle", onToggle);
    return () => dialog.removeEventListener("toggle", onToggle);
  }, [cart]);

  return (
    <dialog
      ref={dialogRef}
      id={CART_DRAWER_ID}
      data-testid="cart-drawer"
      className="drawer-right bg-surface text-on-surface"
      aria-labelledby="cart-drawer-title"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center py-2 ps-4">
          <div className="flex flex-1 items-center gap-2">
            <h2 id="cart-drawer-title" className="text-on-surface text-lg font-medium">
              Cart
            </h2>
            {badge ? <span className="cart-count-badge">{badge}</span> : null}
          </div>
          <button
            type="button"
            commandfor={CART_DRAWER_ID}
            command="close"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close cart"
            onClick={closeCartDrawer}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CartContents compact />
          <span className="sr-only" aria-live="polite" aria-atomic="true" />
        </div>
        {totalQuantity > 0 ? (
          <div className="border-border shrink-0 border-t p-4">
            <CartSummary />
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
