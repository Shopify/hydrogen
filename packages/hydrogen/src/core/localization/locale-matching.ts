import { SHOPIFY_COUNTRY_CODES, SHOPIFY_LANGUAGE_CODES } from "../../graphql/generated/iso-codes";
import type { I18nConfig, ShopifyCountryCode, ShopifyLanguageCode } from "../request-context";
import {
  normalizePathPrefix,
  prependPathPrefix,
  stripI18nPathPrefix,
} from "../standard-routes/path";

/** A `{country, language}` pair identifying a locale a storefront serves. */
export type SupportedLocale = Pick<I18nConfig, "country" | "language">;

/** A resolved locale, ready to feed `createShopifyRequestContext({i18n})`. */
export type MatchedLocale = SupportedLocale & { pathPrefix: string };

/**
 * The single localization config shared by URL matching, the server handlers, and selector
 * data filtering, so routing and the selector can never disagree about which locales exist.
 */
export type LocalizationConfig = {
  /** Locale served at unprefixed paths. Its own prefix never matches — one canonical URL per page. */
  defaultLocale: SupportedLocale;
  /**
   * Locales served under `/{language}-{country}` prefixes. Pass the explicit list this
   * storefront serves, or `"all"` to accept any valid Shopify country/language pair — an
   * opt-in for Markets-driven stores that must route new markets without a deploy. `"all"`
   * makes every code pair a routable URL variant, so canonical/hreflang tags become the
   * app's responsibility.
   */
  supportedLocales: readonly SupportedLocale[] | "all";
};

/**
 * Resolves the locale of a request from its URL path prefix.
 *
 * Pure and synchronous: the URL is the only input that affects the result, so the same URL
 * always resolves to the same locale. Unknown or malformed prefixes resolve to `defaultLocale`.
 *
 * Framework-specific URL shapes must be normalized by the caller before matching (for example,
 * React Router single-fetch requests append `.data` to the pathname).
 */
export function matchLocaleFromRequest(
  request: Request,
  config: LocalizationConfig,
): MatchedLocale {
  return matchLocalePathname(new URL(request.url).pathname, config);
}

/**
 * Pathname-level matching for callers that hold a path rather than a `Request` — resolving
 * the locale of a form's redirect target, a link, or a stored path. Same contract as
 * `matchLocaleFromRequest`.
 */
export function matchLocalePathname(pathname: string, config: LocalizationConfig): MatchedLocale {
  const candidateSegment = getFirstPathSegment(pathname);

  const locale =
    config.supportedLocales === "all"
      ? parseLocaleSegment(candidateSegment)
      : findSupportedLocale(candidateSegment, config.supportedLocales);

  if (!locale || isSameLocale(locale, config.defaultLocale)) {
    return { ...config.defaultLocale, pathPrefix: "" };
  }

  return { ...locale, pathPrefix: getLocalePathPrefix(locale) };
}

function findSupportedLocale(
  candidateSegment: string,
  supportedLocales: readonly SupportedLocale[],
): SupportedLocale | null {
  const candidatePrefix = `/${candidateSegment}`;
  return supportedLocales.find((locale) => getLocalePathPrefix(locale) === candidatePrefix) ?? null;
}

/**
 * Parses a path segment as `{language}-{country}` against the universal Shopify code sets.
 * Hyphenated language variants map back to underscore codes (`pt-br-br` → `PT_BR` + `BR`).
 */
function parseLocaleSegment(segment: string): SupportedLocale | null {
  const separatorIndex = segment.lastIndexOf("-");
  if (separatorIndex === -1) return null;

  const language = segment.slice(0, separatorIndex).replaceAll("-", "_").toUpperCase();
  const country = segment.slice(separatorIndex + 1).toUpperCase();
  if (!isShopifyLanguageCode(language) || !isShopifyCountryCode(country)) return null;

  return { country, language };
}

const COUNTRY_CODE_SET: ReadonlySet<string> = new Set(SHOPIFY_COUNTRY_CODES);
const LANGUAGE_CODE_SET: ReadonlySet<string> = new Set(SHOPIFY_LANGUAGE_CODES);

export function isShopifyCountryCode(value: string): value is ShopifyCountryCode {
  return COUNTRY_CODE_SET.has(value);
}

export function isShopifyLanguageCode(value: string): value is ShopifyLanguageCode {
  return LANGUAGE_CODE_SET.has(value);
}

function getFirstPathSegment(pathname: string): string {
  const [firstSegment = ""] = pathname.replace(/^\/+/, "").split("/");
  return firstSegment.toLowerCase();
}

/** Module-internal: shared by the redirect helper and server handlers, not public API. */
export function isSameLocale(a: SupportedLocale, b: SupportedLocale): boolean {
  return a.country === b.country && a.language === b.language;
}

/** Module-internal: whether the config allows a locale. `"all"` allows any valid pair. */
export function isSupportedLocale(
  locale: SupportedLocale,
  supportedLocales: LocalizationConfig["supportedLocales"],
): boolean {
  if (supportedLocales === "all") return true;
  return supportedLocales.some((supported) => isSameLocale(supported, locale));
}

/**
 * Canonical path prefix for a locale: `/{language}-{country}`, lowercase. Underscore language
 * codes (e.g. `PT_BR`) canonicalize to hyphens (`/pt-br-br`) to match web URL conventions.
 */
export function getLocalePathPrefix(locale: SupportedLocale): string {
  return `/${locale.language}-${locale.country}`.toLowerCase().replace(/_/g, "-");
}

export type GetLocalizedPathOptions = {
  /** Locale path prefix currently on the path, e.g. `"/fr-ca"`. Empty for the default locale. */
  fromPathPrefix: string | undefined;
  /** Locale path prefix to apply, e.g. `"/en-ca"`. Empty for the default locale. */
  toPathPrefix: string | undefined;
};

/**
 * Re-homes a relative path from one locale prefix to another, preserving search params and hash.
 *
 * Accepts relative paths only; same-origin sanitization of untrusted URLs is the caller's
 * responsibility.
 */
export function getLocalizedPath(path: string, options: GetLocalizedPathOptions): string {
  const suffixStartIndex = findPathSuffixStart(path);
  const pathname = path.slice(0, suffixStartIndex) || "/";
  const suffix = path.slice(suffixStartIndex);

  const unprefixedPathname = stripI18nPathPrefix(pathname, options.fromPathPrefix);
  return localizePathname(unprefixedPathname, options.toPathPrefix) + suffix;
}

function localizePathname(pathname: string, toPathPrefix: string | undefined): string {
  if (pathname !== "/") return prependPathPrefix(pathname, toPathPrefix);

  // Avoid a trailing-slash artifact when localizing the root path ("/fr-ca", not "/fr-ca/").
  return normalizePathPrefix(toPathPrefix) || "/";
}

function findPathSuffixStart(path: string): number {
  const searchIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");

  if (searchIndex === -1) return hashIndex === -1 ? path.length : hashIndex;
  if (hashIndex === -1) return searchIndex;
  return Math.min(searchIndex, hashIndex);
}
