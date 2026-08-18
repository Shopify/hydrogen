"use client";

import { ShopPayButton } from "@shopify/hydrogen/react";
import { Suspense } from "react";

import { useSuspenseCart } from "@/lib/cart";
import { CART_DRAWER_ID, closeCartDrawer, configureOpenCartAction } from "@/lib/cart-drawer";
import { content } from "@/lib/content";

import { CartContent } from "./CartContent";

export function CartDrawer() {
  return (
    <dialog
      id={CART_DRAWER_ID}
      className="drawer-right bg-surface text-on-surface"
      aria-labelledby="cart-drawer-title"
      closedby="any"
    >
      <Suspense fallback={<div role="status">Loading cart...</div>}>
        <CartDrawerInner />
      </Suspense>
    </dialog>
  );
}

/**
 * Cart drawer — a native `<dialog>` + `showModal()` rendered once in the root
 * layout (`hydrogen-cart-drawer` skill). Opens via `openCartDrawer()`,
 * `window.Shopify.actions.openCart()`, or after a successful add-to-cart. The
 * `/cart` route is the fallback route when the drawer is unavailable. Uses
 * fixed header/body/footer zones; the body scrolls, the footer is hidden when
 * the cart is empty.
 */
function CartDrawerInner() {
  // Ensure the Standard Actions `openCart` handler is registered on the client.
  configureOpenCartAction();

  const totalQuantity = useSuspenseCart((state) => state.data.totalQuantity);
  const isEmpty = totalQuantity === 0;
  const checkoutUrl = useSuspenseCart((state) => state.data.checkoutUrl);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center py-2 ps-4 pe-2">
        <div className="flex flex-1 items-center gap-2">
          <h2 id="cart-drawer-title" className="text-on-surface text-lg font-medium">
            {content.cart.title}{" "}
            <span className="text-on-surface-secondary text-sm font-normal">
              {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
            </span>
          </h2>
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

      {!isEmpty && checkoutUrl ? (
        <div className="border-border grid shrink-0 gap-3 border-t p-4">
          <ShopPayButton width="100%" borderRadius="8px" />
          <a
            href={checkoutUrl}
            className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {content.cart.checkout}
          </a>
        </div>
      ) : null}
    </div>
  );
}
