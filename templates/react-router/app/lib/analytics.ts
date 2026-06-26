import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type ConsentConfig,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;
let configuredShop: ShopAnalytics | null = null;
let configuredConsent: ConsentConfig = { mode: "custom-banner" };

export function configureAnalytics(shop: ShopAnalytics, consent?: ConsentConfig): void {
  configuredShop = shop;
  if (consent) configuredConsent = consent;
}

export function getAnalyticsShop(): ShopAnalytics | null {
  return configuredShop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  if (!configuredShop) return null;
  bus ??= createStorefrontAnalytics({
    shop: configuredShop,
    consent: configuredConsent,
  });
  return bus;
}
