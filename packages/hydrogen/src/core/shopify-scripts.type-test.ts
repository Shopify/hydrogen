import { describe, expectTypeOf, it } from "vitest";

import type { ConsentConfig, ConsentPreferences, ConsentSetup, ShopifyGlobal, StorefrontAnalyticsConfig } from "./index";
import type { ShopifyScriptTagsOptions } from "./shopify-scripts";

describe("Shopify script option types", () => {
  it("requires complete shop identity", () => {});
});

export function shopifyGlobalTypes(shopify: ShopifyGlobal) {
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
  const setup: ConsentSetup = async (context) => {
    expectTypeOf<keyof typeof context>().toEqualTypeOf<"setTrackingConsent">();
    const { setTrackingConsent } = context;
    const choice: ConsentPreferences = {
      analytics: true,
      marketing: false,
      preferences: true,
      sale_of_data: false,
    };
    expectTypeOf(setTrackingConsent(choice)).toEqualTypeOf<Promise<void>>();
    // @ts-expect-error providers must explicitly map all four consent purposes
    setTrackingConsent({ analytics: true });
    // @ts-expect-error unresolved provider state is not a consent choice
    setTrackingConsent({ ...choice, analytics: undefined });
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
