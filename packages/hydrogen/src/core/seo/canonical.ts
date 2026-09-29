import {
  prependPathPrefix,
  stripI18nPathPrefix,
  stripTrailingSlash,
} from "../standard-routes/path";
import type {
  GetCanonicalUrlOptions,
  GetLanguageAlternatesOptions,
  LanguageAlternate,
} from "./types";

function toUrl(url: string | URL): URL {
  return typeof url === "string" ? new URL(url) : new URL(url.href);
}

function applyOrigin(url: URL, origin: string | undefined): URL {
  if (!origin) return url;

  const trusted = new URL(origin);
  return new URL(`${url.pathname}${url.search}`, trusted.origin);
}

function applyTrailingSlash(pathname: string, trailingSlash: boolean): string {
  const stripped = stripTrailingSlash(pathname);
  if (!trailingSlash || stripped === "/") return stripped;
  return `${stripped}/`;
}

/**
 * Builds the canonical URL for a storefront page.
 *
 * Drops the hash and every query param not listed in `keepSearchParams`, so
 * `?Color=Red`, `?variant=123`, filters, sort keys, cursors, and tracking
 * params all resolve to one canonical URL. Normalizes the trailing slash and,
 * when `origin` is passed, replaces the request origin with the trusted one.
 *
 * @example
 * ```ts
 * getCanonicalUrl(request.url, { origin: env.PUBLIC_SITE_ORIGIN });
 * // "https://example.com/products/snowboard"
 * ```
 */
export function getCanonicalUrl(url: string | URL, options: GetCanonicalUrlOptions = {}): string {
  const { origin, keepSearchParams = [], trailingSlash = false } = options;

  const canonical = applyOrigin(toUrl(url), origin);
  canonical.hash = "";
  canonical.pathname = applyTrailingSlash(canonical.pathname, trailingSlash);

  const keep = new Set(keepSearchParams);
  const kept = new URLSearchParams();
  for (const [key, value] of canonical.searchParams) {
    if (keep.has(key)) kept.append(key, value);
  }
  kept.sort();
  canonical.search = kept.toString();

  return canonical.toString();
}

/**
 * Builds `hreflang` alternates for every locale the storefront serves.
 *
 * Strips `currentPathPrefix` from the URL's pathname, then prepends each
 * locale's `pathPrefix`. The result maps directly onto
 * `<link rel="alternate" hreflang="…" href="…">` tags. The current locale is
 * included, as the hreflang spec requires each page to reference itself.
 *
 * @example
 * ```ts
 * getLanguageAlternates(request.url, {
 *   currentPathPrefix: i18n.pathPrefix,
 *   locales: [
 *     { hrefLang: "en-US" },
 *     { hrefLang: "fr-CA", pathPrefix: "/fr-ca" },
 *   ],
 *   xDefault: "en-US",
 * });
 * ```
 */
export function getLanguageAlternates(
  url: string | URL,
  options: GetLanguageAlternatesOptions,
): LanguageAlternate[] {
  const { locales, currentPathPrefix, origin, xDefault } = options;

  const canonical = new URL(getCanonicalUrl(url, { origin }));
  const pathname = stripI18nPathPrefix(canonical.pathname, currentPathPrefix);

  const alternates = locales.map((locale) => ({
    hrefLang: locale.hrefLang,
    href: new URL(prependPathPrefix(pathname, locale.pathPrefix), canonical.origin).toString(),
  }));

  const defaultAlternate = xDefault
    ? alternates.find((alternate) => alternate.hrefLang === xDefault)
    : undefined;
  if (defaultAlternate) {
    alternates.push({ hrefLang: "x-default", href: defaultAlternate.href });
  }

  return alternates;
}
