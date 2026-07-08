"use client";

import type { ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { AnalyticsEvent, configureAnalytics, getAnalytics } from "@/lib/analytics";

/**
 * Root analytics tracker (`hydrogen-analytics` / `references/react.md` Next.js
 * App Router shape). Keys the `PAGE_VIEWED` effect by `pathname + "?" + search`
 * so client navigations fire a fresh page view (F9: no polling). Wrapped in
 * `<Suspense>` in `Providers` so the `useSearchParams()` CSR bailout is scoped
 * to the tracker, not the whole layout.
 */
export function AnalyticsTracker({
  shop,
  consent,
}: {
  shop: ShopAnalytics;
  consent: ConsentConfig;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    configureAnalytics(shop, consent);
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey, shop, consent]);

  return null;
}
