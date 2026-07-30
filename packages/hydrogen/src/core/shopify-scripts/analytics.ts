import initializeShopifyAnalyticsBus from "../analytics/cdn/bootstrap" with { type: "script" };
import type { StorefrontAnalyticsConfig } from "../analytics/types";
import type { ShopifyScriptTagsOptions } from "./types";
import { asInlineScript } from "./utils/inline-script";

export function getShopifyAnalyticsConfig({
  analytics,
  consent,
  shop,
}: Pick<ShopifyScriptTagsOptions, "analytics" | "consent" | "shop">): StorefrontAnalyticsConfig {
  const channel = analytics?.channel ?? "hydrogen";

  return {
    shop:
      channel === "headless"
        ? { shopId: shop.shopId, channel }
        : { shopId: shop.shopId, storefrontId: shop.storefrontId, channel },
    consent: consent ?? {},
    customData: analytics?.customData,
  };
}

export function getShopifyAnalyticsBusScript(analytics: StorefrontAnalyticsConfig): string {
  return asInlineScript(initializeShopifyAnalyticsBus)(analytics);
}
