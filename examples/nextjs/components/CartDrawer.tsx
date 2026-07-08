"use client";

import { useCart } from "@/lib/cart";
import { CART_DRAWER_ID, closeCartDrawer, configureOpenCartAction } from "@/lib/cart-drawer";
import { content } from "@/lib/content";

import { CartContent } from "./CartContent";

/**
 * Cart drawer — a native `<dialog>` + `showModal()` rendered once in the root
 * layout (`hydrogen-cart-drawer` skill). Opens via `openCartDrawer()`,
 * `window.Shopify.actions.openCart()`, or after a successful add-to-cart. The
 * `/cart` route is the no-JS fallback (F4). Uses fixed header/body/footer
 * zones; the body scrolls, the footer is hidden when the cart is empty.
 */
export function CartDrawer() {
  // Ensure the Standard Actions `openCart` handler is registered on the client.
  configureOpenCartAction();

  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const isEmpty = totalQuantity === 0;
  const checkoutUrl = useCart((state) => state.data.checkoutUrl);

  return (
    <dialog
      id={CART_DRAWER_ID}
      className="drawer-right bg-surface text-on-surface"
      aria-labelledby="cart-drawer-title"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center py-2 ps-4 pe-2">
          <div className="flex flex-1 items-center gap-2">
            <h2 id="cart-drawer-title" className="text-on-surface text-lg font-medium">
              {content.cart.title}
            </h2>
            <span className="cart-count-badge" aria-hidden="true">
              {totalQuantity}
            </span>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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

        <div className="min-h-0 flex-1 p-4">
          <CartContent />
        </div>

        {!isEmpty ? (
          <div className="border-border shrink-0 border-t p-4">
            <a
              href={checkoutUrl ?? "#"}
              className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {content.cart.checkout}
            </a>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
