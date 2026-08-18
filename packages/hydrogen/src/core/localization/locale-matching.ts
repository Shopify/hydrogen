import type { I18nConfig } from "../request-context";
import {
  normalizePathPrefix,
  prependPathPrefix,
  stripI18nPathPrefix,
} from "../standard-routes/path";

/** A `{country, language}` pair identifying a locale a storefront serves. */
export type SupportedLocale = Pick<I18nConfig, "country" | "language">;

/** A resolved locale, ready to feed `createShopifyRequestContext({i18n})`. */
export type MatchedLocale = SupportedLocale & { pathPrefix: string };

export type MatchLocaleFromRequestOptions = {
  /** Locale served at unprefixed paths. Its own prefix never matches — one canonical URL per page. */
  defaultLocale: SupportedLocale;
  /** Locales the app serves under `/{language}-{country}` prefixes (strict mode). */
  supportedLocales: readonly SupportedLocale[];
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
  options: MatchLocaleFromRequestOptions,
): MatchedLocale {
  const { pathname } = new URL(request.url);
  const candidatePrefix = `/${getFirstPathSegment(pathname)}`;

  for (const locale of options.supportedLocales) {
    if (isSameLocale(locale, options.defaultLocale)) continue;

    const pathPrefix = getLocalePathPrefix(locale);
    if (pathPrefix === candidatePrefix) return { ...locale, pathPrefix };
  }

  return { ...options.defaultLocale, pathPrefix: "" };
}

function getFirstPathSegment(pathname: string): string {
  const [firstSegment = ""] = pathname.replace(/^\/+/, "").split("/");
  return firstSegment.toLowerCase();
}

function isSameLocale(a: SupportedLocale, b: SupportedLocale): boolean {
  return a.country === b.country && a.language === b.language;
}

/**
 * Canonical path prefix for a locale: `/{language}-{country}`, lowercase. Underscore language
 * codes (e.g. `PT_BR`) canonicalize to hyphens (`/pt-br-br`) to match web URL conventions.
 */
function getLocalePathPrefix(locale: SupportedLocale): string {
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
