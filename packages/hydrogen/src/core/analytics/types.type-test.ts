import { describe, expectTypeOf, it } from "vitest";

import type { ShopAnalytics } from "./types";

describe("ShopAnalytics types", () => {
  it("models ShopifyScripts shop analytics fields", () => {});
});

export function shopAnalyticsTypes() {
  expectTypeOf<ShopAnalytics>().toMatchTypeOf<
    | {
        shopId: string;
        channel: "hydrogen";
        storefrontId: string;
      }
    | {
        shopId: string;
        channel: "headless";
      }
  >();

  const shop: ShopAnalytics = {
    shopId: "gid://shopify/Shop/1",
    channel: "hydrogen",
    storefrontId: "gid://shopify/HydrogenStorefront/1",
  };
  expectTypeOf(shop.storefrontId).toEqualTypeOf<string>();

  const headlessShop: ShopAnalytics = {
    shopId: "gid://shopify/Shop/1",
    channel: "headless",
  };
  void headlessShop;

  // @ts-expect-error storefrontId is required
  const missingStorefrontId: ShopAnalytics = {
    shopId: "gid://shopify/Shop/1",
    channel: "hydrogen",
  };
  void missingStorefrontId;

  // @ts-expect-error storefrontId is only accepted for Hydrogen channel analytics
  const invalidHeadlessShop: ShopAnalytics = {
    shopId: "gid://shopify/Shop/1",
    channel: "headless",
    storefrontId: "gid://shopify/HydrogenStorefront/1",
  };
  void invalidHeadlessShop;

  const invalidShop: ShopAnalytics = {
    shopId: "gid://shopify/Shop/1",
    channel: "hydrogen",
    // @ts-expect-error acceptedLanguage and currency are read from window.Shopify
    acceptedLanguage: "EN",
    currency: "USD",
    storefrontId: "gid://shopify/HydrogenStorefront/1",
  };
  void invalidShop;
}
