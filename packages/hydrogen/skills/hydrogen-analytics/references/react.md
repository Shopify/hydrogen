# React Frameworks

Use ShopifyScripts in the root layout/head, then publish events from client-side tracker components.

## Root Tracker

Server root/layout resolves safe `shop` and `i18n` data and passes it to ShopifyScripts.

```tsx
<ShopifyScripts
  shop={{
    shopId: env.SHOP_ID,
    storefrontId: env.PUBLIC_STOREFRONT_ID ?? "0",
    myshopifyDomain: env.PUBLIC_STORE_DOMAIN,
  }}
  i18n={{ country: market.country, language: market.language, currency: market.currencyCode }}
  consent={{ mode: "default-banner" }}
/>
```

Do not query `localization.language` just to echo the language already passed to `@inContext`. If the app only knows country/language and does not have a market currency code, add `currencyCode` to the app's market config or query `localization { country { currency { isoCode } } }` as a fallback.

```tsx
import { useEffect } from "react";
import { AnalyticsEvent, getAnalytics } from "../lib/analytics";

export function AnalyticsTracker() {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, []);

  return null;
}
```

Add `"use client"` only when this component lives in a Next.js App Router client component file.

For real route tracking, include the framework location in the effect dependency. In React Router, read `useLocation()` and key the effect by `location.pathname + location.search`. In Next App Router, read `usePathname()` and `useSearchParams()` in a client component wrapped in `Suspense`, then key the effect by both values. View events infer `url` from `window.location.href`; pass `url` only for an explicit override.

Cart analytics should publish from the confirmed cart state. If a component reads cart state directly, wait while `cart.revalidating === true || cart.pending.cost === true || cart.pending.note` is true so optimistic or revalidating cart changes do not publish as settled analytics.

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <AnalyticsTracker />
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
import { AnalyticsEvent, getAnalytics } from "../lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey]);

  return null;
}
```

## Product Viewed

Publish after product route data is available:

```tsx
function ProductViewedTracker({ product, selectedVariant }: Props) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;

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
});
```

Publish search view only for non-empty terms:

```tsx
if (term) {
  analytics.publish(AnalyticsEvent.SEARCH_VIEWED, {
    searchTerm: term,
    searchResults: { totalCount },
  });
}
```

## Cart Updates

Use the `useCartAnalytics()` hook from the React binding — rendered inside `CartProvider`, it calls `trackCartAnalytics(store)` in an effect and cleans up on unmount. Outside the binding, call `trackCartAnalytics(store)` once with the cart store from a client-only effect (`useEffect`) — never at cart-store creation time, since it throws when `window.Shopify.analytics` is missing during SSR. It subscribes itself, skips pending/revalidating/note updates, derives cart delta events from confirmed cart changes, returns an unsubscribe function, and uses the global analytics bus created by ShopifyScripts. Do not manually publish `product_added_to_cart`.

Publish `CART_VIEWED` when the cart page or drawer is viewed. The cart payload is `AnalyticsCart | null`: when a compatible cart is available, include `id`, `updatedAt`, and connection-shaped `lines`; otherwise pass `cart: null` instead of a partial cart.

```tsx
analytics.publish(AnalyticsEvent.CART_VIEWED, {
  cart: analyticsCart ?? null,
});
```

If the app uses Hydrogen's cart store type directly, convert it at the app boundary before publishing analytics. Only pass settled cart lines that include product IDs, vendor, and variant price fields.
