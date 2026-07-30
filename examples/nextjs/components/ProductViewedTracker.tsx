"use client";

import { useEffect } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import type { ProductData } from "@/lib/product-query";

/**
 * Publishes `PRODUCT_VIEWED` when the product route mounts/changes
 * (`hydrogen-analytics` / `references/react.md`). Rendered inside the
 * `ProductProvider` so it re-runs on product identity changes.
 */
export function ProductViewedTracker({ product }: { product: ProductData }) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    const variant = product.selectedOrFirstAvailableVariant;
    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price: variant?.price.amount ?? product.priceRange.minVariantPrice.amount,
          vendor: product.vendor,
          variantId: variant?.id ?? product.id,
          variantTitle: variant?.title ?? product.title,
          quantity: 1,
          sku: variant?.sku ?? undefined,
        },
      ],
    });
    // Key on `product.handle` (route identity), not the whole object, so an
    // unrelated re-render (e.g. a cart-store update on the PDP) doesn't
    // re-publish PRODUCT_VIEWED (`hydrogen-analytics/references/react.md`).
    // oxlint `exhaustive-deps` is intentionally disabled for this file — see
    // `.oxlintrc.json` — because the skill mandates under-depending on handle.
  }, [product.handle]);

  return null;
}
