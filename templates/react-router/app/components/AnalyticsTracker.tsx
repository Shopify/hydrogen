import { useEffect } from "react";
import { useLocation } from "react-router";

import { AnalyticsEvent, addAnalyticsConsoleDestination, getAnalytics } from "../lib/analytics";

/**
 * Root analytics tracker (`hydrogen-analytics` / `references/react.md`).
 * Publishes page views through the global bus created by `ShopifyScripts`.
 * Keys the effect by the framework location so client navigations fire a fresh
 * page view (F9: no polling).
 */
export function AnalyticsTracker() {
  const location = useLocation();
  const pageKey = `${location.pathname}?${location.search}`;

  useEffect(() => {
    const cleanup = addAnalyticsConsoleDestination();
    return () => {
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }, [pageKey]);

  return null;
}
