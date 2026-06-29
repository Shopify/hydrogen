"use client";

import type { ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { Suspense, type ReactNode } from "react";

import { CartProvider } from "../lib/cart";
import { AnalyticsTracker, CartAnalyticsTracker } from "./AnalyticsTrackers";

export function Providers({
  cart,
  analyticsShop,
  analyticsConsent,
  enableTestTap,
  children,
}: {
  cart: Parameters<typeof CartProvider>[0]["initialData"];
  analyticsShop: ShopAnalytics;
  analyticsConsent: ConsentConfig;
  enableTestTap: boolean;
  children: ReactNode;
}) {
  return (
    <CartProvider initialData={cart}>
      <Suspense fallback={null}>
        <AnalyticsTracker
          shop={analyticsShop}
          consent={analyticsConsent}
          enableTestTap={enableTestTap}
        />
      </Suspense>
      <CartAnalyticsTracker />
      {children}
    </CartProvider>
  );
}
