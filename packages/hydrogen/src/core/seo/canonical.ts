import {
  prependPathPrefix,
  stripI18nPathPrefix,
  stripTrailingSlash,
} from "../standard-routes/path";
import type {
  GetCanonicalUrlOptions,
  GetLanguageAlternatesOptions,
  LanguageAlternate,
  LanguageAlternateLocale,
} from "./types";

/** Reduces a configured origin such as `https://example.com/ignored` to its origin. */
export function normalizeOrigin(origin: string): string {
  return new URL(origin).origin;
}

function applyOrigin(url: URL, origin: string | undefined): URL {
  return origin ? new URL(`${url.pathname}${url.search}`, normalizeOrigin(origin)) : url;
}

function applyTrailingSlash(pathname: string, trailingSlash: boolean): string {
  const stripped = stripTrailingSlash(pathname);
  if (!trailingSlash || stripped === "/") return stripped;
  return `${stripped}/`;
}

function toCanonicalUrl(url: string | URL, options: GetCanonicalUrlOptions): URL {
  const { origin, keepSearchParams = [], trailingSlash = false } = options;

  const canonical = applyOrigin(new URL(url), origin);
  canonical.hash = "";
  canonical.pathname = applyTrailingSlash(canonical.pathname, trailingSlash);

  const keep = new Set(keepSearchParams);
  const kept = new URLSearchParams();
  for (const [key, value] of canonical.searchParams) {
    if (keep.has(key)) kept.append(key, value);
  }
  kept.sort();
  canonical.search = kept.toString();

  return canonical;
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
  return toCanonicalUrl(url, options).toString();
}

/**
 * Pairs each locale with its localized href and appends `x-default` for the
 * locale named by `xDefault`. Shared by `<link rel="alternate">` output and
 * sitemap `xhtml:link` output so the hreflang rule has one implementation.
 */
export function buildLanguageAlternates(
  locales: readonly LanguageAlternateLocale[],
  hrefs: readonly string[],
  xDefault: string | undefined,
): LanguageAlternate[] {
  const alternates = locales.map((locale, index) => ({
    hrefLang: locale.hrefLang,
    href: hrefs[index] ?? "",
  }));

  const defaultAlternate = xDefault
    ? alternates.find((alternate) => alternate.hrefLang === xDefault)
    : undefined;
  if (defaultAlternate) {
    alternates.push({ hrefLang: "x-default", href: defaultAlternate.href });
  }

  return alternates;
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

  const canonical = toCanonicalUrl(url, { origin });
  const pathname = stripI18nPathPrefix(canonical.pathname, currentPathPrefix);
  const hrefs = locales.map((locale) =>
    new URL(prependPathPrefix(pathname, locale.pathPrefix), canonical.origin).toString(),
  );

  return buildLanguageAlternates(locales, hrefs, xDefault);
}
