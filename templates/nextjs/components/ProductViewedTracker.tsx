"use client";

import { useEffect, useEffectEvent } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import type { ProductData } from "@/lib/product-query";

/**
 * Publishes `PRODUCT_VIEWED` when the product route mounts/changes
 * (`hydrogen-analytics` / `references/react.md`). Rendered inside the
 * `ProductProvider` so it re-runs on product identity changes.
 */
export function ProductViewedTracker({ product }: { product: ProductData }) {
  const publishViewed = useEffectEvent(() => {
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
  });

  useEffect(() => {
    publishViewed();
  }, [product.handle]);

  return null;
}
