import { describe, expectTypeOf, it } from "vitest";

import type { ConsentConfig, ConsentPreferences, ConsentSetup, ShopifyGlobal, StorefrontAnalyticsConfig } from "./index";
import type { ShopifyScriptTagsOptions } from "./shopify-scripts";

describe("Shopify script option types", () => {
  it("requires complete shop identity", () => {});
});

export function shopifyGlobalTypes(shopify: ShopifyGlobal) {
  expectTypeOf(
    shopify.customerPrivacy.setTrackingConsent({ analytics: true }),
  ).toEqualTypeOf<Promise<unknown>>();
  // @ts-expect-error only the promise form is exposed in Hydrogen's types
  void shopify.customerPrivacy.setTrackingConsent({ analytics: true }, () => {});

  expectTypeOf(window.Shopify).toEqualTypeOf<ShopifyGlobal | undefined>();
  // @ts-expect-error callers must narrow the optional global before using it
  window.Shopify.customerPrivacy;
  // @ts-expect-error internal token methods are not part of the public ShopifyGlobal type
  shopify.customerPrivacy.__internal;

  // @ts-expect-error consent diagnostics are not part of the public ShopifyGlobal type
  shopify.customerPrivacy.config?.debug;

  // @ts-expect-error consent diagnostics are not exposed on window.Shopify
  window.Shopify?.customerPrivacy.config?.debug;
}

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
  };
  void missingShopId;
}

// @ts-expect-error setup must return a promise representing initial consent readiness
const synchronous: ConsentSetup = () => {};
// @ts-expect-error setup resolves without a cleanup callback
const cleanupReturn: ConsentSetup = async () => () => {};
void [synchronous, cleanupReturn];

export function consentSetupTypes() {
  expectTypeOf<Parameters<ConsentSetup>>().toEqualTypeOf<[]>();
  const setup: ConsentSetup = async () => {
    const customerPrivacy = window.Shopify?.customerPrivacy;
    if (!customerPrivacy) throw new Error("Shopify Customer Privacy API is unavailable.");
    const choice: ConsentPreferences = {
      analytics: true,
      marketing: false,
      preferences: true,
      sale_of_data: false,
    };
    expectTypeOf(customerPrivacy.setTrackingConsent(choice)).toEqualTypeOf<Promise<unknown>>();
    await customerPrivacy.setTrackingConsent(choice);
  };
  const custom: ConsentConfig = { mode: "custom-banner", setup };
  const asyncCustom: ConsentConfig = { mode: "custom-banner", setup: async () => {} };
  const noBanner: ConsentConfig = {};
  const defaultBanner: ConsentConfig = { mode: "default-banner" };
  void [custom, asyncCustom, noBanner, defaultBanner];

  // @ts-expect-error custom-banner requires an integration
  const missingSetup: ConsentConfig = { mode: "custom-banner" };
  // @ts-expect-error Shopify's banner owns its setup
  const defaultWithSetup: ConsentConfig = { mode: "default-banner", setup };
  // @ts-expect-error setup only belongs to custom-banner
  const noBannerWithSetup: ConsentConfig = { mode: "no-banner", setup };
  // @ts-expect-error selecting custom-banner must be explicit
  const missingMode: ConsentConfig = { setup };
  void [missingSetup, defaultWithSetup, noBannerWithSetup, missingMode];

  const config: StorefrontAnalyticsConfig = { shop: null, consent: { mode: "custom-banner" } };
  // @ts-expect-error analytics destinations only see serialized consent settings
  config.consent.setup;
}
