# Next.js App Router Analytics

Read `references/react.md` first: it owns the singleton, the event payloads, and the collection, search, and cart rules for every React app. This file covers only what App Router does differently.

Next App Router pages are async server components. Effects must live in client components. The pattern: one root-level `AnalyticsTracker` for `page_viewed`, plus per-page client trackers for product/collection/search.

```tsx
// app/components/AnalyticsTracker.tsx
"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalytics, AnalyticsEvent } from "../lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [key]);

  return null;
}
```

Wrap the tracker in `<Suspense>` in the root layout. `useSearchParams()` opts the client tree out of static rendering; the Suspense boundary keeps that opt-out scoped to the tracker, not the whole layout:

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

Per-page trackers are thin client components that take server-resolved data and publish on mount:

```tsx
// app/components/ProductViewedTracker.tsx
"use client";
import { useEffect } from "react";
import { getAnalytics, AnalyticsEvent } from "../lib/analytics";

type Props = {
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string;
    selectedOrFirstAvailableVariant: {
      id: string;
      title: string;
      price: { amount: string };
      sku?: string | null;
    } | null;
    priceRange: { minVariantPrice: { amount: string } };
  };
};

export function ProductViewedTracker({ product }: Props) {
  useEffect(() => {
    const bus = getAnalytics();
    if (!bus) return;
    bus.publish(AnalyticsEvent.PRODUCT_VIEWED, {
      products: [{
        id: product.id,
        title: product.title,
        price:
          product.selectedOrFirstAvailableVariant?.price.amount ??
          product.priceRange.minVariantPrice.amount,
        vendor: product.vendor,
        variantId: product.selectedOrFirstAvailableVariant?.id ?? product.id,
        variantTitle:
          product.selectedOrFirstAvailableVariant?.title ?? product.title,
        quantity: 1,
        sku: product.selectedOrFirstAvailableVariant?.sku,
      }],
    });
  }, [product.handle]);
  return null;
}
```

Render it from the (server) page component:

```tsx
// app/products/[handle]/page.tsx
export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  return (
    <main>
      <ProductViewedTracker product={product} />
      {/* …rest of UI… */}
    </main>
  );
}
```
