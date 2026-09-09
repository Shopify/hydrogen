import { defineShopifyI18n } from "@shopify/hydrogen";

type StorefrontConfigShape = {
  storeDomain: string;
  publicStorefrontToken: string;
};

type I18nShape = { country: "US"; language: "EN"; currency: "USD" };

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

/** Single-locale storefront: every request resolves to the default locale. */
export const i18n = defineShopifyI18n({
  defaultLocale: { country: "US", language: "EN" },
});

/** Locale plus display currency for `ShopifyScripts`. */
export const defaultI18n = {
  ...i18n.defaultLocale,
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
