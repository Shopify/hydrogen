type StorefrontConfigShape = {
  storeDomain: string;
  publicStorefrontToken: string;
};

type I18nShape = { country: "US"; language: "EN"; currency: string };

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
};

export const storefrontConfig = {
  storeDomain: process.env.NEXT_PUBLIC_STORE_DOMAIN || "",
  publicStorefrontToken: process.env.NEXT_PUBLIC_STOREFRONT_API_TOKEN || "",
} satisfies StorefrontConfigShape;

export const customerAccountConfig = {
  shopId: process.env.NEXT_PUBLIC_SHOP_ID || "",
  customerAccountApiClientId: process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID || "",
} satisfies CustomerAccountConfigShape;

export const defaultI18n = {
  country: "US",
  language: "EN",
  // Used only if Storefront API localization cannot resolve the active market.
  currency: "USD",
} satisfies I18nShape;

export const shop = {
  shopId: customerAccountConfig.shopId,
  storefrontId: process.env.NEXT_PUBLIC_STOREFRONT_ID || "",
  myshopifyDomain: storefrontConfig.storeDomain,
} satisfies ShopifyScriptsShopShape;

export const analyticsConsent = {
  mode: "default-banner",
} satisfies AnalyticsConsentShape;
