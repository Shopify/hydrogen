import { AnalyticsEvent } from "@shopify/hydrogen";

export { AnalyticsEvent };

export function getAnalytics() {
  if (typeof window === "undefined") return null;
  return window.Shopify?.analytics ?? null;
}
