import { defineShopifyI18n, type ShopifyLocale } from "@shopify/hydrogen";

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

const SCRIPT_TAGS: Partial<Record<ShopifyLocale["language"], string>> = {
  ZH_CN: "zh-Hans",
  ZH_TW: "zh-Hant",
};

/**
 * `<html lang>` names the content language, so the market country is not appended. Shopify's
 * regional codes become BCP 47 tags (`PT_BR` -> `pt-BR`); Chinese differs by script, not region.
 */
export function toHtmlLang(language: ShopifyLocale["language"]): string {
  return (
    SCRIPT_TAGS[language] ??
    language.toLowerCase().replace(/_(\w+)$/, (_, region: string) => `-${region.toUpperCase()}`)
  );
}
