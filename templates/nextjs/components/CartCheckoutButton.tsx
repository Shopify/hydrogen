"use client";

import { ShopPayButton } from "@shopify/hydrogen/react";

import { useSuspenseCart } from "@/lib/cart";
import { content } from "@/lib/content";

/**
 * `/cart` checkout button — reads the hydrated cart store for `checkoutUrl` and
 * `totalQuantity`. Hidden when the cart is empty.
 */
export function CartCheckoutButton() {
  const totalQuantity = useSuspenseCart((state) => state.data.totalQuantity);
  const checkoutUrl = useSuspenseCart((state) => state.data.checkoutUrl);
  const isEmpty = totalQuantity === 0;

  if (isEmpty || !checkoutUrl) return null;

  return (
    <div className="border-border mt-6 grid gap-3 border-t pt-4">
      <ShopPayButton width="100%" borderRadius="8px" />
      <a
        href={checkoutUrl}
        className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {content.cart.checkout}
      </a>
    </div>
  );
}
