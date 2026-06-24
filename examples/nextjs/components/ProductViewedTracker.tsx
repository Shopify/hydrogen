"use client";

import { useEffect } from "react";

import { getAnalytics, analyticsShop, AnalyticsEvent } from "@/lib/analytics";

type Props = {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string;
    priceRange: { minVariantPrice: { amount: string } };
    selectedOrFirstAvailableVariant: {
      id: string;
      title: string;
      price: { amount: string };
      sku?: string | null;
    } | null;
  };
  selectedVariant?: {
    id: string;
    title: string;
    price: { amount: string };
    sku?: string | null;
  } | null;
};

export function ProductViewedTracker({ product, selectedVariant }: Props) {
  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price:
            selectedVariant?.price.amount ??
            product.selectedOrFirstAvailableVariant?.price.amount ??
            product.priceRange.minVariantPrice.amount,
          vendor: product.vendor,
          variantId: selectedVariant?.id ?? product.id,
          variantTitle: selectedVariant?.title ?? product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
        },
      ],
      url: window.location.href,
      shop: analyticsShop,
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- fire only on product navigation
  }, [product.handle]);

  return null;
}
