import type { Env } from "./platform";
import { getEnvValue } from "./platform";

const DEFAULT_STORE_DOMAIN = "hydrogen-preview.myshopify.com";
const DEFAULT_SHOP_ID = "55145660472";
const DEFAULT_STOREFRONT_ID = "1000014875";
const MOCK_SHOP_DOMAIN = "mock.shop";
const MOCK_SHOP_PRIVATE_TOKEN = "mock-private-token";

export const defaultI18n = {
  country: "US",
  language: "EN",
  currency: "USD",
} as const;

// Use Shopify's default consent banner and Customer Privacy behavior.
export const analyticsConsent = {
  mode: "default-banner",
} as const;

export const defaultShop = {
  shopId: DEFAULT_SHOP_ID,
  storefrontId: DEFAULT_STOREFRONT_ID,
  myshopifyDomain: DEFAULT_STORE_DOMAIN,
} as const;

export function getShop(env: Env) {
  return {
    shopId: getEnvValue(env, "SHOP_ID") ?? DEFAULT_SHOP_ID,
    storefrontId: getEnvValue(env, "PUBLIC_STOREFRONT_ID") ?? DEFAULT_STOREFRONT_ID,
    myshopifyDomain: getEnvValue(env, "PUBLIC_STORE_DOMAIN") ?? DEFAULT_STORE_DOMAIN,
  };
}

export type CustomerAccountConfig = {
  customerAccountApiClientId: string;
  sessionSecret: string;
  shopId: string;
};

export function resolveStorefrontConfig(env: Env) {
  const privateStorefrontToken = getEnvValue(env, "PRIVATE_STOREFRONT_API_TOKEN");
  const usingMockShop = env.MOCK_SHOP === "1" || !privateStorefrontToken;

  return {
    storeDomain: usingMockShop
      ? MOCK_SHOP_DOMAIN
      : (getEnvValue(env, "PUBLIC_STORE_DOMAIN") ?? DEFAULT_STORE_DOMAIN),
    privateStorefrontToken: privateStorefrontToken ?? MOCK_SHOP_PRIVATE_TOKEN,
    usingMockShop,
  };
}

export function resolveCustomerAccountConfig(
  env: Env,
  usingMockShop: boolean,
): CustomerAccountConfig | undefined {
  if (usingMockShop) return;

  const customerAccountApiClientId = getEnvValue(env, "PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID");
  const sessionSecret = getEnvValue(env, "CUSTOMER_ACCOUNT_SESSION_SECRET");
  const shopId = getEnvValue(env, "SHOP_ID");

  if (!customerAccountApiClientId || !sessionSecret || !shopId) return;

  return { customerAccountApiClientId, sessionSecret, shopId };
}

const BUYER_IP_HEADERS = ["oxygen-buyer-ip", "cf-connecting-ip", "x-forwarded-for"] as const;

export function getBuyerIp(headers: Pick<Headers, "get">): string {
  for (const header of BUYER_IP_HEADERS) {
    const buyerIp = headers.get(header)?.split(",")[0]?.trim();
    if (buyerIp) return buyerIp;
  }

  if (import.meta.env.MODE !== "production") return "127.0.0.1";
  throw new Error(`${BUYER_IP_HEADERS.join(", ")} is required for private Storefront API clients`);
}

export function getSiteOrigin(env: Env): string {
  return (getEnvValue(env, "PUBLIC_SITE_ORIGIN") ?? "http://localhost:5173").replace(/\/+$/, "");
}
