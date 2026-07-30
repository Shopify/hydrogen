import {
  AnalyticsEvent,
  type ConsentConfig,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let configuredShop: ShopAnalytics | null = null;

export function configureAnalytics(shop: ShopAnalytics, consent?: ConsentConfig): void {
  configuredShop = shop;
  void consent;
}

export function getAnalyticsShop(): ShopAnalytics | null {
  return configuredShop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  return (window.Shopify?.analytics as StorefrontAnalytics | undefined) ?? null;
}
