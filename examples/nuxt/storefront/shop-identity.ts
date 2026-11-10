import type { ShopifyScriptTagsOptions } from "@shopify/hydrogen";

import { analyticsConsent, shop } from "../../shared/config";
import type { StorefrontModeConfig } from "./storefront-config";

export type ShopIdentity = Pick<
  ShopifyScriptTagsOptions,
  "analytics" | "consent" | "shop" | "shopifyAnalytics"
>;

export function resolveShopIdentity(storefront: StorefrontModeConfig): ShopIdentity {
  if (storefront.mode === "mock") {
    return {
      analytics: { channel: "headless" },
      consent: undefined,
      shop: {
        shopId: "0",
        storefrontId: "",
        myshopifyDomain: storefront.storeDomain,
      },
      shopifyAnalytics: false,
    };
  }

  return {
    analytics: undefined,
    consent: analyticsConsent,
    shop,
    shopifyAnalytics: true,
  };
}
