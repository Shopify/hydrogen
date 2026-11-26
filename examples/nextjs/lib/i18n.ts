import { defineShopifyI18n } from "@shopify/hydrogen";

type I18nShape = { country: "US"; language: "EN" };

/** Single-locale storefront: every request resolves to the default locale. */
export const i18n = defineShopifyI18n({
  defaultLocale: { country: "US", language: "EN" },
});

/** Default locale for `ShopifyScripts`. */
export const defaultI18n = {
  ...i18n.defaultLocale,
} satisfies I18nShape;
