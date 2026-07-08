"use client";

import { useEffect } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import { useCart } from "@/lib/cart";

/**
 * Publishes `CART_VIEWED` when the `/cart` page is viewed
 * (`hydrogen-analytics` / `references/react.md`). The cart payload is
 * `AnalyticsCart | null`: when a compatible cart is available, include `id` +
 * `updatedAt` + connection-shaped `lines`; otherwise pass `cart: null`.
 */
export function CartViewedTracker() {
  const cart = useCart((state) => state.data);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.CART_VIEWED, {
      cart: cart.id ? cart : null,
      prevCart: null,
    });
  }, [cart]);

  return null;
}
