import type {
  ShopifyDomainLocale,
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
