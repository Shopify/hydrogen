"use client";

import { useEffect, useRef } from "react";

import { getAnalytics } from "@/lib/analytics";
import { useCart } from "@/lib/cart";

/**
 * Subscribes to cart store changes and forwards server-confirmed cart data to
 * `analytics.updateCart()` (`hydrogen-analytics`). The bus derives
 * `cart_updated` / `product_added_to_cart` / `product_removed_to_cart` from
 * cart deltas — app code should never publish those manually.
 *
 * The cart query includes `updatedAt` (see `app/lib/cart-handlers.ts`), which
 * the bus uses for dedupe. Without it, every `updateCart()` call is ignored.
 */
export function CartAnalyticsTracker() {
  const cart = useCart((state) => state.data);
  const prevUpdatedAt = useRef<string | null>(null);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    // Only update when the cart has a usable id + updatedAt (the bus ignores
    // carts without updatedAt).
    if (!cart.id || !cart.updatedAt) return;
    if (prevUpdatedAt.current === cart.updatedAt) return;
    prevUpdatedAt.current = cart.updatedAt;
    analytics.updateCart(cart);
  }, [cart]);

  return null;
}
