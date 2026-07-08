"use client";

import { useCart } from "@/lib/cart";
import { CART_DRAWER_ID, openCartDrawer } from "@/lib/cart-drawer";
import { cartIconLabel, cartItemCount } from "@/lib/content";

/**
 * Cart trigger — a `<button>` that opens the cart drawer via `showModal()`
 * (`hydrogen-cart-drawer` skill). `onClick` calls `openCartDrawer()`, which
 * calls `HTMLDialogElement.showModal()`; `aria-controls`/`aria-haspopup` keep
 * the control accessible. The footer `/cart` link is the no-JS cart surface.
 */
export function CartTrigger() {
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const cartLabel = cartIconLabel(totalQuantity);
  const countDisplay = totalQuantity > 99 ? "99+" : String(totalQuantity);

  return (
    <>
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
    </>
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
