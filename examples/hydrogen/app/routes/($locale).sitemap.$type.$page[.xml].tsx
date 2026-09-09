import { getLocalizedHref, getSupportedLocales, type ShopifyLocale } from "@shopify/hydrogen";

import { i18n } from "~/lib/i18n";
import { createSitemapResponse } from "~/lib/sitemap";

import type { Route } from "./+types/($locale).sitemap.$type.$page[.xml]";

const SITEMAP_MAX_AGE_SECONDS = 86_400;
const SITEMAP_CACHE_CONTROL = `max-age=${SITEMAP_MAX_AGE_SECONDS}`;

// hreflang values are BCP 47 (`fr-CA`); the i18n definition is the single source of which exist.
const LOCALES_BY_HREFLANG = new Map(
  getSupportedLocales(i18n).map((locale) => [toHreflang(locale), locale] as const),
);

export async function loader({ request, params, context: { storefront } }: Route.LoaderArgs) {
  const response = await createSitemapResponse({
    storefront,
    request,
    params,
    locales: [...LOCALES_BY_HREFLANG.keys()],
    getLink: ({ type, baseUrl, handle, locale: hreflang }) => {
      const path = `/${type}/${handle}`;
      const locale = hreflang ? LOCALES_BY_HREFLANG.get(hreflang) : undefined;
      return `${baseUrl}${locale ? getLocalizedHref(path, { i18n, locale }) : path}`;
    },
  });

  response.headers.set("Cache-Control", SITEMAP_CACHE_CONTROL);

  return response;
}

function toHreflang({ language, country }: ShopifyLocale): string {
  return `${language.toLowerCase().replace("_", "-")}-${country}`;
}
