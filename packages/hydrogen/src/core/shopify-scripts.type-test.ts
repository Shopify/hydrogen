import { describe, expectTypeOf, it } from "vitest";

import type { ShopifyScriptTagsOptions } from "./shopify-scripts";

describe("Shopify script option types", () => {
  it("requires complete shop identity", () => {});
  it("requires i18n currency when Shopify analytics is enabled", () => {});
});

export function shopifyScriptOptionTypes() {
  expectTypeOf<ShopifyScriptTagsOptions["shop"]>().toEqualTypeOf<{
    shopId: string;
    storefrontId: string;
    myshopifyDomain: string;
  }>();

  // @ts-expect-error shop is required
  const missingShop: ShopifyScriptTagsOptions = {};
  void missingShop;

  const missingShopId: ShopifyScriptTagsOptions = {
    // @ts-expect-error shopId is required
    shop: {
      storefrontId: "sub-1",
      myshopifyDomain: "test-shop.myshopify.com",
    },
    shopifyAnalytics: false,
  };
  void missingShopId;
}

export function shopifyScriptCurrencyTypes() {
  const shop = {
    shopId: "gid://shopify/Shop/1",
    storefrontId: "sub-1",
    myshopifyDomain: "test-shop.myshopify.com",
  };

  // @ts-expect-error i18n with currency is required when Shopify analytics is enabled by default
  const missingI18n: ShopifyScriptTagsOptions = { shop };
  void missingI18n;

  // @ts-expect-error currency is required when Shopify analytics is enabled by default
  const missingCurrency: ShopifyScriptTagsOptions = {
    shop,
    i18n: { country: "US", language: "EN" },
  };
  void missingCurrency;

  // @ts-expect-error currency is required when Shopify analytics is enabled
  const missingCurrencyExplicitAnalytics: ShopifyScriptTagsOptions = {
    shop,
    shopifyAnalytics: true,
    i18n: { country: "US", language: "EN" },
  };
  void missingCurrencyExplicitAnalytics;

  const withCurrency: ShopifyScriptTagsOptions = {
    shop,
    i18n: { country: "US", language: "EN", currency: "USD" },
  };
  void withCurrency;

  const analyticsDisabledWithoutI18n: ShopifyScriptTagsOptions = {
    shop,
    shopifyAnalytics: false,
  };
  void analyticsDisabledWithoutI18n;

  const analyticsDisabledWithoutCurrency: ShopifyScriptTagsOptions = {
    shop,
    shopifyAnalytics: false,
    i18n: { country: "US", language: "EN" },
  };
  void analyticsDisabledWithoutCurrency;

  const runtimeFlag = Math.random() > 0.5;

  const runtimeFlagWithCurrency: ShopifyScriptTagsOptions = {
    shop,
    shopifyAnalytics: runtimeFlag,
    i18n: { country: "US", language: "EN", currency: "USD" },
  };
  void runtimeFlagWithCurrency;

  // @ts-expect-error a runtime boolean cannot prove analytics is disabled, so currency is required
  const runtimeFlagWithoutCurrency: ShopifyScriptTagsOptions = {
    shop,
    shopifyAnalytics: runtimeFlag,
    i18n: { country: "US", language: "EN" },
  };
  void runtimeFlagWithoutCurrency;
}
