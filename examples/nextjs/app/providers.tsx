"use client";

import type { ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "@/components/CartAnalyticsTracker";
import { CartProvider } from "@/lib/cart";
import type { cartHandlers } from "@/lib/cart-handlers";

/**
 * Client `CartProvider` wrapper + root analytics trackers
 * (`hydrogen-cart-ui` / `references/react.md` Next.js App Router section +
 * `hydrogen-analytics` / `references/react.md`). The root server layout reads
 * the cart seed and the analytics shop GID on the server, then passes them here.
 *
 * `cartData` is the full handler data envelope (`{cart, errors?}`). It is
 * `undefined` when the server cart read timed out or errored — **not**
 * `{cart: null}`. `{cart: null}` means "server confirmed no usable cart"
 * (suppresses the post-hydration `/api/cart` fetch); `undefined` means "no
 * bootstrap → fetch `/api/cart` after hydration" so the count self-corrects.
 * `CartProvider` accepts `undefined` (F1).
 *
 * `AnalyticsTracker` reads `usePathname` + `useSearchParams`; it stays inside
 * the `<Suspense>` boundary the layout wraps around `Providers` so the
 * `useSearchParams()` CSR bailout is scoped to the tracker, not the layout.
 */
export type CartData = Awaited<ReturnType<typeof cartHandlers.get>>["data"];

export function Providers({
  cartData,
  analyticsShop,
  analyticsConsent,
  children,
}: {
  cartData?: CartData;
  analyticsShop: ShopAnalytics;
  analyticsConsent: ConsentConfig;
  children: ReactNode;
}) {
  return (
    <CartProvider initialData={cartData}>
      {/* Suspense scopes the `useSearchParams()` CSR bailout to the tracker,
          not the whole layout (hydrogen-analytics / references/react.md). */}
      <Suspense fallback={null}>
        <AnalyticsTracker shop={analyticsShop} consent={analyticsConsent} />
      </Suspense>
      <CartAnalyticsTracker />
      {children}
    </CartProvider>
  );
}
