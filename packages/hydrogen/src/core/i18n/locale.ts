import type {
  ShopifyDomainLocale,
  ShopifyLanguageCode,
  ShopifyLocale,
  ShopifyMatchedLocale,
  ShopifyPathnameLocale,
} from "./types";

export function isSameLocale(a: ShopifyLocale, b: ShopifyLocale): boolean {
  return a.language === b.language && a.country === b.country;
}

export function formatLocale(locale: ShopifyLocale): string {
  return `${locale.language}-${locale.country}`;
}

const SCRIPT_LANGUAGE_TAGS: Partial<Record<ShopifyLanguageCode, string>> = {
  ZH_CN: "zh-Hans",
  ZH_TW: "zh-Hant",
};

/**
 * The BCP 47 tag for content written in `language`, e.g. for `<html lang>`: `EN` → `en`, `PT_BR` →
 * `pt-BR`. Chinese differs by script, so `ZH_CN` → `zh-Hans` and `ZH_TW` → `zh-Hant`. Takes no
 * country because the market does not change the content language.
 * @publicDocs
 */
export function getLanguageTag(language: ShopifyLanguageCode): string {
  return (
    SCRIPT_LANGUAGE_TAGS[language] ??
    language.toLowerCase().replace(/_(\w+)$/, (_, region: string) => `-${region.toUpperCase()}`)
  );
}

/**
 * The URL path segment that identifies a locale: `pathSegment` when set, otherwise
 * `{language}-{country}` lowercased with `_` replaced by `-` (`FR`/`CA` → `fr-ca`, `PT_BR`/`BR` →
 * `pt-br-br`).
 *
 * Defined for every locale regardless of routing type, so it doubles as a stable identifier
 * where the URL cannot carry the locale itself: a `[locale]` route param that static rendering
 * derives the locale from, or the internal path a domain-routed request is rewritten to.
 * `resolveSupportedLocale` accepts this segment back.
 *
 * Accepts matched locales too: `matchLocale` replaces `pathSegment` with the derived
 * `pathPrefix`, so a non-empty prefix is the segment's source of truth there.
 */
export function getLocalePathSegment(locale: ShopifyPathnameLocale | ShopifyMatchedLocale): string {
  if ("pathSegment" in locale && locale.pathSegment !== undefined) {
    return locale.pathSegment.toLowerCase();
  }
  if ("pathPrefix" in locale && locale.pathPrefix !== "") {
    return locale.pathPrefix.slice(1).toLowerCase();
  }
  return deriveLocalePathSegment(locale);
}

/** The locale's hostname in the form `URL.hostname` reports it. */
export function getLocaleHostname(locale: ShopifyDomainLocale): string {
  return locale.hostname.toLowerCase();
}

function deriveLocalePathSegment(locale: ShopifyLocale): string {
  return `${locale.language.replaceAll("_", "-")}-${locale.country}`.toLowerCase();
}
