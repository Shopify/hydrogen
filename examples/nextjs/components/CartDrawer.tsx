"use client";

import { useEffect, useMemo } from "react";

import { useCart } from "@/lib/cart";
import {
  CART_DRAWER_ID,
  closeCartDrawer,
  configureOpenCartAction,
  supportsDialogCommands,
} from "@/lib/cart-drawer";

import { CartNote, CartTotals, CheckoutButton, DiscountCodes, LineItems } from "./Cart";

// React types do not include Invoker Commands yet: https://github.com/facebook/react/issues/32478
const closeCartCommandAttributes = {
  command: "close",
  commandfor: CART_DRAWER_ID,
};

export function CartDrawer() {
  const hasItems = useCart((s) => s.data.lines.nodes.length > 0);
  const lines = useCart((s) => s.data.lines.nodes);
  const errors = useCart((s) => s.errors);
  const errorMessages = useMemo(() => {
    const visibleLineIds = new Set(lines.map((line) => line.id));
    const orphanedLineErrors = [...errors.lines.entries()]
      .filter(([lineId]) => !visibleLineIds.has(lineId))
      .flatMap(([, group]) => [...group.userErrors, ...group.warnings]);

    return [
      ...new Set([
        ...errors.network.map((error) => error.message),
        ...errors.cart.userErrors.map((error) => error.message),
        ...errors.cart.warnings.map((warning) => warning.message),
        ...errors.note.userErrors.map((error) => error.message),
        ...orphanedLineErrors.map((error) => error.message),
      ]),
    ];
  }, [errors, lines]);

  useEffect(() => configureOpenCartAction(), []);

  return (
    <dialog id={CART_DRAWER_ID} aria-labelledby="cart-drawer-title" closedby="any">
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-black/10">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 id="cart-drawer-title" className="text-lg font-bold">
              Cart
            </h2>
            <button
              type="button"
              {...closeCartCommandAttributes}
              onClick={() => {
                if (!supportsDialogCommands()) closeCartDrawer();
              }}
              aria-label="Close cart"
              className="hover:opacity-60"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden={true}
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          {errorMessages.length > 0 && (
            <div role="alert" className="bg-red-50 px-6 py-3 text-sm text-red-700">
              {errorMessages.map((message, i) => (
                <p key={i}>{message}</p>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <LineItems />
        </div>

        {hasItems && (
          <footer className="shrink-0 space-y-3 border-t border-black/10 px-6 py-3">
            <DiscountCodes />
            <CartNote />
            <CartTotals />
            <CheckoutButton />
          </footer>
        )}
      </div>
    </dialog>
  );
}
