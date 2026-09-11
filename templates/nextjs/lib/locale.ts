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
 * `cacheComponents`, so every page and `generateMetadata` goes through here instead.
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
 * For the `[locale]` root layout only. A root layout has no parent boundary to render a 404 in,
 * so `notFound()` there is a 500. `proxy.ts` only ever produces supported segments, but paths its
 * matcher skips (`/favicon.ico`) can still land here with junk; render the shell in the default
 * locale and let the page's strict `resolveLocaleParam` produce the 404.
 */
export function resolveShellLocale(segment: string): Locale {
  try {
    return resolveSupportedLocale(segment, i18n);
  } catch (error) {
    if (error instanceof UnsupportedLocaleError)
      return resolveSupportedLocale(i18n.defaultLocale, i18n);
    throw error;
  }
}

/**
 * BCP 47 tag for `<html lang>` and `hreflang`. Only one region subtag is allowed and Shopify's
 * regional language codes (`PT_BR`, `ZH_TW`) already carry one, so keep the primary language and
 * let `country` name the targeted region: PT_BR + BR -> `pt-BR`, PT_BR + CA -> `pt-CA`. The two
 * Chinese codes differ by script, not region, so they keep a script subtag: ZH_TW + HK -> `zh-Hant-HK`.
 */
export function toLanguageTag({ language, country }: ShopifyLocale): string {
  const primary = LANGUAGE_TAG_OVERRIDES[language] ?? language.replace(/_.*$/, "").toLowerCase();
  return `${primary}-${country}`;
}

const LANGUAGE_TAG_OVERRIDES: Partial<Record<ShopifyLocale["language"], string>> = {
  ZH_CN: "zh-Hans",
  ZH_TW: "zh-Hant",
};

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

  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    const tag = toLanguageTag(locale);
    if (tag in alternates) {
      // Two locales collapsing to one hreflang (PT_BR + BR and PT_PT + BR) would silently drop one
      // alternate; fail the build instead so the definition gets fixed.
      throw new Error(
        `Locales ${locale.language}-${locale.country} and another supported locale both produce hreflang "${tag}".`,
      );
    }
    alternates[tag] = canonicalUrl(path, locale);
  }
  return alternates;
}

/** `metadata.alternates` for a page: its canonical URL in `locale` plus hreflang alternates. */
export function localizedAlternates(
  path: string,
  locale: ShopifyLocale,
): NonNullable<Metadata["alternates"]> {
  return { canonical: canonicalUrl(path, locale), languages: alternateUrls(path) };
}
