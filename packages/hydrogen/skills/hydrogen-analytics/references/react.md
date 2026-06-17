# React Frameworks

Use a client-side tracker component and a shared singleton module.

## Root Tracker

Server root/layout resolves safe `ShopAnalytics` data and passes it to a client tracker. `shopId` is the Shopify Shop GID; fetch `shop { id }` from the Storefront API or read it from existing server-side app config that already stores that GID. Use the app's resolved market/i18n data for `acceptedLanguage` and `currency`.

```tsx
// React framework loader or server layout
import { gql } from "@shopify/hydrogen";

const SHOP_ANALYTICS_QUERY = gql(`
  query ShopAnalytics {
    shop { id }
  }
`);

const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);

const analyticsShop = {
  shopId: data.shop.id,
  acceptedLanguage: market.language,
  currency: market.currencyCode,
  hydrogenSubchannelId: process.env.PUBLIC_STOREFRONT_ID ?? "0",
};
```

Do not query `localization.language` just to echo the language already passed to `@inContext`. If the app only knows country/language and does not have a market currency code, add `currencyCode` to the app's market config or query `localization { country { currency { isoCode } } }` as a fallback.

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

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await getAnalyticsShop();

  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker shop={shop} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
```

```tsx
// app/components/AnalyticsTracker.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { ShopAnalytics } from "@shopify/hydrogen";
import { AnalyticsEvent, configureAnalytics, getAnalytics } from "../lib/analytics";

export function AnalyticsTracker({ shop }: { shop: ShopAnalytics }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    configureAnalytics(shop);
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop,
    });
  }, [pageKey, shop]);

  return null;
}
```

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

Publish `CART_VIEWED` when the cart page or drawer is viewed. The cart payload is `AnalyticsCart | null`: when a compatible cart is available, include `id`, `updatedAt`, and connection-shaped `lines`; otherwise pass `cart: null` instead of a partial cart.

```tsx
analytics.publish(AnalyticsEvent.CART_VIEWED, {
  cart: analyticsCart ?? null,
  prevCart: null,
  url: window.location.href,
  shop,
});
```

If the app uses Hydrogen's cart store type directly, convert it at the app boundary before publishing analytics. Only pass settled cart lines that include product IDs, vendor, and variant price fields.
