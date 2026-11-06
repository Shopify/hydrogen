import type {
  ShopifyDomainLocale,
  ShopifyLanguageCode,
  ShopifyLocale,
  ShopifyMatchedLocale,
  ShopifyPathnameLocale,
} from "./types";

const HTML_LANG_SCRIPT_TAGS: Partial<Record<ShopifyLanguageCode, string>> = {
  ZH_CN: "zh-Hans",
  ZH_TW: "zh-Hant",
};

/**
 * Converts a Shopify language code into the BCP 47 tag for the `<html lang>` attribute:
 * `EN` → `en`, `PT_BR` → `pt-BR`, `ZH_TW` → `zh-Hant`.
 *
 * The attribute names the language the page is written in, so it takes the language code only,
 * not the market country: Portuguese content sold in Canada is still `pt-BR`. Use the market
 * country for `hreflang` instead, where the region names the targeted audience.
 *
 * @example
 * ```tsx
 * <html lang={getHtmlLang(requestContext.locale.language)}>
 * ```
 *
 * @publicDocs
 */
export function getHtmlLang(language: ShopifyLanguageCode): string {
  return (
    HTML_LANG_SCRIPT_TAGS[language] ??
    language.toLowerCase().replace(/_(\w+)$/, (_, region: string) => `-${region.toUpperCase()}`)
  );
}

export function isSameLocale(a: ShopifyLocale, b: ShopifyLocale): boolean {
  return a.language === b.language && a.country === b.country;
}

export function formatLocale(locale: ShopifyLocale): string {
  return `${locale.language}-${locale.country}`;
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
