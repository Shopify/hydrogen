import {
  getLocalePathSegment,
  getLocalizedHref,
  getSupportedLocales,
  resolveSupportedLocale,
  type ShopifyLocale,
  type ShopifyMatchedLocale,
  UnsupportedLocaleError,
} from "@shopify/hydrogen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { i18n } from "./config";
import { SITE_ORIGIN } from "./site";

/** The locale resolved for the current `[locale]` segment, with its `pathPrefix`/`hostname`. */
export type Locale = ShopifyMatchedLocale<typeof i18n>;

/** `generateStaticParams` for the `[locale]` segment: one static shell per supported locale. */
export function localeParams(): { locale: string }[] {
  return getSupportedLocales(i18n).map((locale) => ({ locale: getLocalePathSegment(locale) }));
}

/**
 * Resolves the `[locale]` route param, or 404s for a segment that is not a supported locale.
 * `dynamicParams = false` would do this at the router level but is not allowed under
 * `cacheComponents`, so every layout/page/metadata entry point goes through here instead.
 */
export function resolveLocaleParam(segment: string): Locale {
  try {
    return resolveSupportedLocale(segment, i18n);
  } catch (error) {
    if (error instanceof UnsupportedLocaleError) notFound();
    throw error;
  }
}

/**
 * BCP 47 `language-REGION` for `<html lang>` and `hreflang`. Only one region subtag is allowed,
 * and Shopify's regional language codes (`PT_BR`, `ZH_TW`) already carry one, so keep the primary
 * language and let `country` name the targeted region: PT_BR + BR -> `pt-BR`, PT_BR + CA -> `pt-CA`.
 */
export function toLanguageTag({ language, country }: ShopifyLocale): string {
  return `${language.replace(/_.*$/, "").toLowerCase()}-${country}`;
}

/** Same page in `locale`: a prefixed path under pathname routing, an absolute URL under domain routing. */
export function localizedHref(path: string, locale: ShopifyLocale): string {
  return getLocalizedHref(path, { i18n, locale });
}

/** Absolute canonical URL for `path` in `locale`, resolved against the trusted `SITE_ORIGIN`. */
export function canonicalUrl(path: string, locale: ShopifyLocale): string {
  return new URL(localizedHref(path, locale), SITE_ORIGIN).toString();
}

/**
 * `hreflang` -> absolute URL for every supported locale, for `alternates.languages` and sitemap
 * alternates. Empty for single-locale storefronts, where hreflang carries no information.
 */
export function alternateUrls(path: string): Record<string, string> | undefined {
  const locales = getSupportedLocales(i18n);
  if (locales.length === 1) return undefined;
  return Object.fromEntries(
    locales.map((locale) => [toLanguageTag(locale), canonicalUrl(path, locale)]),
  );
}

/** `metadata.alternates` for a page: its canonical URL in `locale` plus hreflang alternates. */
export function localizedAlternates(
  path: string,
  locale: ShopifyLocale,
): NonNullable<Metadata["alternates"]> {
  return { canonical: canonicalUrl(path, locale), languages: alternateUrls(path) };
}
