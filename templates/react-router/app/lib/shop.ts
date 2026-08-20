import type { ShopAnalytics } from "@shopify/hydrogen";

const MOCK_SHOP_DOMAIN = "mock.shop";
const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";
const MOCK_STOREFRONT_ID = "1000014875";
const SHOP_ID_PATTERN = /^\d+$/;

export const defaultI18n = { country: "US", language: "EN" } as const;

export const analyticsConsent = {
  mode: "default-banner",
} as const;

export type RuntimeEnv = {
  CUSTOMER_ACCOUNT_SESSION_SECRET?: string;
  MOCK_SHOP?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  PUBLIC_STORE_DOMAIN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  SHOP_ID?: string;
};

export type CustomerAccountConfig = {
  customerAccountApiClientId: string;
  sessionSecret: string;
  shopId: string;
};

export type RuntimeConfig = {
  customerAccount?: CustomerAccountConfig;
  enableAnalyticsTestTap: boolean;
  privateStorefrontToken: string;
  storeDomain: string;
  storefrontId?: string;
  usingMockShop: boolean;
};

export function resolveRuntimeConfig(env: RuntimeEnv): RuntimeConfig {
  const privateStorefrontToken = getEnvValue(env, "PRIVATE_STOREFRONT_API_TOKEN");
  if (env.MOCK_SHOP === "1" || !privateStorefrontToken) {
    return {
      enableAnalyticsTestTap: env.MOCK_SHOP === "1",
      privateStorefrontToken: MOCK_SHOP_PRIVATE_TOKEN,
      storeDomain: MOCK_SHOP_DOMAIN,
      usingMockShop: true,
    };
  }

  return {
    customerAccount: resolveCustomerAccountConfig(env),
    enableAnalyticsTestTap: false,
    privateStorefrontToken,
    storeDomain: requireEnvValue(env, "PUBLIC_STORE_DOMAIN"),
    storefrontId: requireEnvValue(env, "PUBLIC_STOREFRONT_ID"),
    usingMockShop: false,
  };
}

export function createShopIdentity(
  config: RuntimeConfig,
  shop: { id: string; name: string },
): {
  analytics: ShopAnalytics;
  scripts: { myshopifyDomain: string; shopId: string; storefrontId: string };
} {
  const storefrontId = config.storefrontId ?? MOCK_STOREFRONT_ID;
  return {
    analytics: {
      channel: "hydrogen",
      shopId: shop.id,
      storefrontId,
    },
    scripts: {
      myshopifyDomain: config.storeDomain,
      shopId: shop.id,
      storefrontId,
    },
  };
}

export function assertCustomerAccountShop(config: RuntimeConfig, shopId: string): void {
  if (!config.customerAccount) return;
  if (shopId === `gid://shopify/Shop/${config.customerAccount.shopId}`) return;
  throw new Error("Customer Account shop configuration does not match the storefront.");
}

function resolveCustomerAccountConfig(env: RuntimeEnv): CustomerAccountConfig | undefined {
  const customerAccountApiClientId = getEnvValue(env, "PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID");
  const sessionSecret = getEnvValue(env, "CUSTOMER_ACCOUNT_SESSION_SECRET");
  const shopId = getEnvValue(env, "SHOP_ID");
  const configuredValues = [customerAccountApiClientId, sessionSecret, shopId].filter(Boolean);

  if (configuredValues.length === 0) return;
  if (!customerAccountApiClientId || !sessionSecret || !shopId) {
    throw new Error(
      "Customer Accounts require SHOP_ID, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID, and CUSTOMER_ACCOUNT_SESSION_SECRET together.",
    );
  }
  if (!SHOP_ID_PATTERN.test(shopId)) {
    throw new Error("SHOP_ID must contain only digits.");
  }

  return { customerAccountApiClientId, sessionSecret, shopId };
}

function requireEnvValue(env: RuntimeEnv, key: keyof RuntimeEnv): string {
  const value = getEnvValue(env, key);
  if (value) return value;
  throw new Error(`${key} is required when PRIVATE_STOREFRONT_API_TOKEN is set.`);
}

function getEnvValue(env: RuntimeEnv, key: keyof RuntimeEnv): string | undefined {
  const value = env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
