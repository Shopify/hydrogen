import type { ConsentConfig, ShopAnalytics } from "@shopify/hydrogen";
import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

import { AnalyticsEvent, configureAnalytics, getAnalytics } from "~/lib/analytics";

/**
 * Root analytics tracker (`hydrogen-analytics` / `references/react.md`).
 * Resolves the safe `ShopAnalytics` + `ConsentConfig` objects on the server
 * root and configures the client singleton before publishing. Keys the
 * `page_viewed` effect by the framework location so client navigations fire a
 * fresh page view (F9: no polling).
 */
export function AnalyticsTracker({
  shop,
  consent,
}: {
  shop: ShopAnalytics;
  consent: ConsentConfig;
}) {
  const pageKey = useLocation({
    select: (location) => `${location.pathname}${location.searchStr}`,
  });

  useEffect(() => {
    configureAnalytics(shop, consent);
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey, shop, consent]);

  return null;
}
