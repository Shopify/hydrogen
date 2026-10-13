"use client";

import { useCartAnalytics } from "@shopify/hydrogen/react";

/**
 * Subscribes to cart store changes and publishes cart analytics events from
 * server-confirmed cart data.
 */
export function CartAnalyticsTracker() {
  useCartAnalytics();
  return null;
}
