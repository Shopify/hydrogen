import { AnalyticsEvent, type StorefrontAnalytics } from "@shopify/hydrogen";

export { AnalyticsEvent };

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  return (window.Shopify?.analytics as StorefrontAnalytics | undefined) ?? null;
}
