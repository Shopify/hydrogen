import type { ShopifyDomainLocale, ShopifyLocale, ShopifyPathnameLocale } from "./types";

export function isSameLocale(a: ShopifyLocale, b: ShopifyLocale): boolean {
  return a.language === b.language && a.country === b.country;
}

export function formatLocale(locale: ShopifyLocale): string {
  return `${locale.language}-${locale.country}`;
}

/** `/{language}-{country}` derived from the locale unless `pathSegment` overrides it. Lowercase. */
export function getLocalePathSegment(locale: ShopifyPathnameLocale): string {
  return (locale.pathSegment ?? deriveLocalePathSegment(locale)).toLowerCase();
}

/** The locale's hostname in the form `URL.hostname` reports it. */
export function getLocaleHostname(locale: ShopifyDomainLocale): string {
  return locale.hostname.toLowerCase();
}

function deriveLocalePathSegment(locale: ShopifyLocale): string {
  return `${locale.language.replaceAll("_", "-")}-${locale.country}`.toLowerCase();
}
