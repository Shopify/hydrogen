import {
  getLocalizedHref,
  getSupportedLocales,
  withStorefrontRateLimit,
  type ShopifyLocale,
} from "@shopify/hydrogen";

import { i18n } from "~/lib/i18n";
import { createSitemapResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).sitemap.$type.$page[.xml]";

// Declared before `LOCALES_BY_HREFLANG`, which calls `toHreflang` at module load.
const HREFLANG_LANGUAGE_OVERRIDES: Partial<Record<ShopifyLocale["language"], string>> = {
  ZH_CN: "zh-Hans",
  ZH_TW: "zh-Hant",
};

// hreflang values are BCP 47 (`fr-CA`); the i18n definition is the single source of which exist.
const LOCALES_BY_HREFLANG = new Map(
  getSupportedLocales(i18n).map((locale) => [toHreflang(locale), locale] as const),
);

export const loader = withStorefrontRateLimit(
  async ({ request, params, context: { storefront } }: Route.LoaderArgs) => {
    return createSitemapResponse({
      storefront,
      request,
      params,
      locales: [...LOCALES_BY_HREFLANG.keys()],
      getLink: ({ type, baseUrl, handle, locale: hreflang }) => {
        const path = `/${type}/${handle}`;
        const locale = hreflang ? LOCALES_BY_HREFLANG.get(hreflang) : undefined;
        const href = locale ? getLocalizedHref(path, { i18n, locale }) : path;
        // Domain routing returns an absolute URL on the locale's host; resolving against
        // `baseUrl` keeps that host and only fills in the origin for pathname hrefs.
        return new URL(href, baseUrl).toString();
      },
    });
  },
);

// BCP 47 allows one region subtag. Shopify's regional language codes (`PT_BR`, `ZH_TW`) already
// carry one, so keep only the primary language and let `country` name the targeted region:
// PT_BR + BR -> `pt-BR`, PT_BR + CA -> `pt-CA`. The Chinese codes differ by script, not region,
// so they keep a script subtag: ZH_TW + HK -> `zh-Hant-HK`.
function toHreflang({ language, country }: ShopifyLocale): string {
  const primaryLanguage =
    HREFLANG_LANGUAGE_OVERRIDES[language] ?? language.replace(/_.*$/, "").toLowerCase();
  return `${primaryLanguage}-${country}`;
}
