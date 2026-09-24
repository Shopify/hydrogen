import { defineShopifyI18n } from "@shopify/hydrogen";

/**
 * The storefront's locales. `EN-US` is served unprefixed; the others under `/en-ca` and `/fr-ca`.
 * `createShopifyRequestContext` resolves the request locale from this definition.
 */
export const i18n = defineShopifyI18n({
  defaultLocale: { country: "US", language: "EN" },
  routing: {
    type: "pathname",
    locales: [
      { country: "CA", language: "EN" },
      { country: "CA", language: "FR" },
    ],
  },
});
