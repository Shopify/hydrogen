type StorefrontConfigShape = {
  storeDomain: string;
  publicStorefrontToken?: string;
  privateStorefrontTokenEnvKey: PrivateStorefrontTokenEnvKey;
};

type I18nShape = { country: "US"; language: "EN"; currency: "USD" };

type PrivateStorefrontTokenEnvKey =
  | "PRIVATE_STOREFRONT_API_TOKEN_HYDROGEN_PREVIEW"
  | "PRIVATE_STOREFRONT_API_TOKEN_OXYGEN_COOKIE";

type ShopifyScriptsShopShape = {
  shopId: string;
  storefrontId: string;
  myshopifyDomain: string;
};

type AnalyticsConsentShape = {
  mode: "default-banner" | "custom-banner" | "no-banner";
};

export type CustomerAccountConfigShape = {
  shopId: string;
  customerAccountApiClientId: string;
  sessionSecret: string;
};

// Local examples only. Production apps must use a private, per-app secret or server-side sessions.
const LOCAL_CUSTOMER_SESSION_SECRET = "local-dev-customer-session-secret-32plus";

// Use this for consent testing
const _oxygenCookiesStore = {
  storeDomain: "oxygencookies.myshopify.com",
  publicStorefrontToken: "8eece95833df895900c1b285987c7f40",
  privateStorefrontTokenEnvKey: "PRIVATE_STOREFRONT_API_TOKEN_OXYGEN_COOKIE",
  publicCustomerAccountApiClientId: "1156385c-3f73-484c-95cd-8900737d3fcf",
  publicStorefrontId: "1000070242",
  shopId: "56819351626",
} as const;

const hydrogenPreviewStore = {
  storeDomain: "hydrogen-preview.myshopify.com",
  publicStorefrontToken: "b97a750a8afa8fe33f2b4012cb3a9f6f",
  privateStorefrontTokenEnvKey: "PRIVATE_STOREFRONT_API_TOKEN_HYDROGEN_PREVIEW",
  publicCustomerAccountApiClientId: "shp_e2b55f4e-9dd6-48aa-91f8-5fa419fda119",
  publicStorefrontId: "1000014875",
  shopId: "55145660472",
} as const;

const ACTIVE_STORE = hydrogenPreviewStore;

export const storefrontConfig = {
  storeDomain: ACTIVE_STORE.storeDomain,
  publicStorefrontToken: ACTIVE_STORE.publicStorefrontToken,
  privateStorefrontTokenEnvKey: ACTIVE_STORE.privateStorefrontTokenEnvKey,
} satisfies StorefrontConfigShape;

export const customerAccountConfig = {
  shopId: ACTIVE_STORE.shopId,
  customerAccountApiClientId: ACTIVE_STORE.publicCustomerAccountApiClientId,
  sessionSecret: LOCAL_CUSTOMER_SESSION_SECRET,
} satisfies CustomerAccountConfigShape;

export const defaultI18n = {
  country: "US",
  language: "EN",
  currency: "USD",
} satisfies I18nShape;

export const shop = {
  shopId: ACTIVE_STORE.shopId,
  storefrontId: ACTIVE_STORE.publicStorefrontId,
  myshopifyDomain: ACTIVE_STORE.storeDomain,
} satisfies ShopifyScriptsShopShape;

export const analyticsConsent = {
  mode: "default-banner",
} satisfies AnalyticsConsentShape;
