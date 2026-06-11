type StorefrontConfigShape = {
  storeDomain: string;
  publicStorefrontToken?: string;
  i18n: { country: "US"; language: "EN" };
};

type AnalyticsShopShape = {
  shopId: string;
  acceptedLanguage: string;
  currency: string;
  hydrogenSubchannelId: string;
};

type AnalyticsConsentShape = {
  consentDomain?: string;
  publicStorefrontAccessToken?: string;
  mode: "default-banner" | "custom-banner" | "no-banner";
  country: "US";
  language: "EN";
};

// Use this for consent testing
const _oxygenCookiesStore = {
  storeDomain: "oxygencookies.myshopify.com",
  publicStorefrontToken: "8eece95833df895900c1b285987c7f40",
  publicStorefrontId: "1000070242",
  shopId: "gid://shopify/Shop/56819351626",
};

const hydrogenPreviewStore = {
  storeDomain: "hydrogen-preview.myshopify.com",
  publicStorefrontToken: "b97a750a8afa8fe33f2b4012cb3a9f6f",
  publicStorefrontId: "1000014875",
  shopId: "gid://shopify/Shop/55145660472",
} as const;

export const storefrontConfig = {
  storeDomain: hydrogenPreviewStore.storeDomain,
  publicStorefrontToken: hydrogenPreviewStore.publicStorefrontToken,
  i18n: { country: "US", language: "EN" },
} satisfies StorefrontConfigShape;

export const analyticsShop = {
  shopId: hydrogenPreviewStore.shopId,
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: hydrogenPreviewStore.publicStorefrontId,
} satisfies AnalyticsShopShape;

export const analyticsConsent = {
  mode: "default-banner",
  country: "US",
  language: "EN",
} satisfies AnalyticsConsentShape;
