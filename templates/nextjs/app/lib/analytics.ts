"use client";

import {
  AnalyticsEvent,
  type ConsentConfig,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

let configuredShop: ShopAnalytics | null = null;

export function configureAnalytics(shop: ShopAnalytics, consent: ConsentConfig) {
  configuredShop = shop;
  void consent;
}

export function getAnalyticsShop() {
  return configuredShop;
}

export function getAnalytics() {
  if (typeof window === "undefined") return null;
  return (window.Shopify?.analytics as StorefrontAnalytics | undefined) ?? null;
}
