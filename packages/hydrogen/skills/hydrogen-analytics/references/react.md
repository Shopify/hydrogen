# React, React Router, And Next.js

Use a client-side tracker component and a shared singleton module.

## Root Tracker

Server root/layout reads safe `ShopAnalytics` data and passes it to a client tracker:

```tsx
// React Router loader or Next server layout
const analyticsShop = {
  shopId: process.env.PUBLIC_SHOP_ID!,
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
};
```

```tsx
import { useEffect } from "react";
import type { ShopAnalytics } from "@shopify/hydrogen";
import {
  AnalyticsEvent,
  configureAnalytics,
  getAnalytics,
  getAnalyticsShop,
} from "../lib/analytics";

export function AnalyticsTracker({ shop }: { shop: ShopAnalytics }) {
  useEffect(() => {
    configureAnalytics(shop);
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop,
    });
  }, [shop]);

  return null;
}
```

Add `"use client"` only when this component lives in a Next.js App Router client component file.

For real route tracking, include the framework location in the effect dependency. In React Router, read `useLocation()` and key the effect by `location.pathname + location.search`. In Next App Router, read `usePathname()` and `useSearchParams()` in a client component wrapped in `Suspense`, then key the effect by both values. Do not leave the root tracker keyed only by `shop`, or client-side navigations will miss page views.

## Product Viewed

Publish after product route data is available:

```tsx
function ProductViewedTracker({ product, selectedVariant }: Props) {
  useEffect(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;

    analytics.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [
        {
          id: product.id,
          title: product.title,
          price:
            selectedVariant?.price.amount ??
            product.selectedOrFirstAvailableVariant?.price.amount ??
            product.priceRange.minVariantPrice.amount,
          vendor: product.vendor,
          variantId:
            selectedVariant?.id ??
            product.selectedOrFirstAvailableVariant?.id ??
            product.id,
          variantTitle:
            selectedVariant?.title ??
            product.selectedOrFirstAvailableVariant?.title ??
            product.title,
          quantity: 1,
          sku: selectedVariant?.sku,
        },
      ],
      url: window.location.href,
      shop,
    });
  }, [product.handle]);

  return null;
}
```

Prefer ProductVariant GID for `variantId`. Falling back to product ID should be treated as incomplete data.

## Collection And Search Viewed

Publish collection view when collection identity changes:

```tsx
analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
  collection: { id: collection.id, handle: collection.handle },
  url: window.location.href,
  shop,
});
```

Publish search view only for non-empty terms:

```tsx
if (term) {
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
    searchTerm: term,
    searchResults: { totalCount },
    url: window.location.href,
    shop,
  });
}
```

## Cart Updates

Subscribe to cart store changes and call `analytics.updateCart(cart)` when server-confirmed cart data changes. Do not manually publish `product_added_to_cart`; the bus derives it from cart deltas.
