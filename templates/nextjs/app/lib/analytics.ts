"use client";

import {
  AnalyticsEvent,
  createStorefrontAnalytics,
  type ConsentConfig,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let bus: StorefrontAnalytics | null = null;
let configuredConsent: ConsentConfig = { mode: "custom-banner" };
let configuredShop: ShopAnalytics | null = null;

export function configureAnalytics(shop: ShopAnalytics, consent: ConsentConfig) {
  configuredShop = shop;
  configuredConsent = consent;
}

export function getAnalyticsShop() {
  return configuredShop;
}

export function getAnalytics() {
  if (typeof window === "undefined") return null;
  if (!configuredShop) return null;
  bus ??= createStorefrontAnalytics({
    shop: configuredShop,
    consent: configuredConsent,
  });
  return bus;
}
