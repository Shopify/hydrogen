"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";

import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CartAnalyticsTracker } from "@/components/CartAnalyticsTracker";
import { CartProvider } from "@/lib/cart";
import type { cartHandlers } from "@/lib/cart-handlers";

/**
 * Client `CartProvider` wrapper + root analytics trackers
 * (`hydrogen-cart-ui` / `references/react.md` Next.js App Router section +
 * `hydrogen-analytics` / `references/react.md`). The server AppShell creates
 * the cart seed promise, then passes it here.
 *
 * `cartData` resolves to the full handler data envelope (`{cart, errors?}`).
 * Passing the promise keeps the shell non-blocking; cart content that needs the
 * full cart uses `useSuspenseCart()` inside a local Suspense boundary.
 *
 * `AnalyticsTracker` reads `usePathname` + `useSearchParams`; it stays inside
 * the `<Suspense>` boundary the layout wraps around `Providers` so the
 * `useSearchParams()` CSR bailout is scoped to the tracker, not the layout.
 */
export type CartData = Awaited<ReturnType<typeof cartHandlers.get>>["data"];

export function Providers({
  cartData,
  children,
}: {
  cartData?: Promise<CartData>;
  children: ReactNode;
}) {
  return (
    <CartProvider initialData={cartData}>
      {/* Suspense scopes the `useSearchParams()` CSR bailout to the tracker,
          not the whole layout (hydrogen-analytics / references/react.md). */}
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      <CartAnalyticsTracker />
      {children}
    </CartProvider>
  );
}
