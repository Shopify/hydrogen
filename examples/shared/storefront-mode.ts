import type { ShopifyScriptTagsOptions } from "@shopify/hydrogen";

import { analyticsConsent, shop, storefrontConfig } from "./config.ts";

const MOCK_SHOP_DOMAIN = "mock.shop";

type RuntimeEnv = Record<string, string | undefined>;

export type ShopIdentity = Pick<
  ShopifyScriptTagsOptions,
  "analytics" | "consent" | "shop" | "shopifyAnalytics"
>;

/** The serializable part of the mode, safe to send to the browser. */
export type StorefrontModeConfig = {
  mode: "mock" | "private";
  storeDomain: string;
};

export type StorefrontMode =
  | {
      mode: "mock";
      storeDomain: string;
      shopIdentity: ShopIdentity;
      customerAccountsEnabled: false;
    }
  | {
      mode: "private";
      storeDomain: string;
      privateStorefrontToken: string;
      shopIdentity: ShopIdentity;
      customerAccountsEnabled: true;
    };

export function resolveStorefrontMode(env: RuntimeEnv): StorefrontMode {
  const configuredDomain = env.PUBLIC_STORE_DOMAIN;
  const privateStorefrontToken = env.PRIVATE_STOREFRONT_API_TOKEN;
  const mockDomain =
    configuredDomain && isMockShopDomain(configuredDomain) ? configuredDomain : undefined;

  if (env.MOCK_SHOP === "1" || !privateStorefrontToken || mockDomain) {
    const storeDomain = mockDomain || MOCK_SHOP_DOMAIN;
    return {
      mode: "mock",
      storeDomain,
      shopIdentity: resolveShopIdentity({ mode: "mock", storeDomain }),
      customerAccountsEnabled: false,
    };
  }

  // The private token, Customer Account, and Shopify script identity all belong to the shared store.
  // Ignore non-mock domain overrides so the Storefront client can't move to another store alone.
  return {
    mode: "private",
    storeDomain: storefrontConfig.storeDomain,
    privateStorefrontToken,
    shopIdentity: resolveShopIdentity({
      mode: "private",
      storeDomain: storefrontConfig.storeDomain,
    }),
    customerAccountsEnabled: true,
  };
}

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

function isMockShopDomain(domain: string): boolean {
  return domain === MOCK_SHOP_DOMAIN || domain.endsWith(`.${MOCK_SHOP_DOMAIN}`);
}
