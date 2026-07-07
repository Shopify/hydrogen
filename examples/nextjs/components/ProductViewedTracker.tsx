"use client";

import { useEffect, useRef } from "react";

import { AnalyticsEvent, getAnalytics } from "@/lib/analytics";
import type { ProductData } from "@/lib/product-query";

/**
 * Publishes `PRODUCT_VIEWED` when the product route mounts/changes
 * (`hydrogen-analytics` / `references/react.md`). Rendered inside the
 * `ProductProvider` so it re-runs on product identity changes.
 */
export function ProductViewedTracker({ product }: { product: ProductData }) {
  const publishedProductHandleRef = useRef<string | undefined>(undefined);
  const variant = product.selectedOrFirstAvailableVariant;
  const productHandle = product.handle;
  const productId = product.id;
  const productTitle = product.title;
  const productVendor = product.vendor;
  const productPrice = variant?.price.amount ?? product.priceRange.minVariantPrice.amount;
  const variantId = variant?.id ?? productId;
  const variantTitle = variant?.title ?? productTitle;
  const variantSku = variant?.sku ?? undefined;

  useEffect(() => {
    if (publishedProductHandleRef.current === productHandle) return;

    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: productId,
          title: productTitle,
          price: productPrice,
          vendor: productVendor,
          variantId,
          variantTitle,
          quantity: 1,
          sku: variantSku,
        },
      ],
    });
    // Track route identity separately from payload deps so exhaustive-deps stays honest without duplicate publishes.
    publishedProductHandleRef.current = productHandle;
  }, [
    productHandle,
    productId,
    productPrice,
    productTitle,
    productVendor,
    variantId,
    variantSku,
    variantTitle,
  ]);

  return null;
}
