import {
  getLocalePathSegment,
  type ShopifyI18n,
  type ShopifyMatchedLocale,
} from "@shopify/hydrogen";

/**
 * URL rules `proxy.ts` applies so that every page renders from the `app/[locale]` tree. Pure
 * functions over `URL` + the matched locale so they can be unit-tested without Next.
 */

/**
 * Every page lives under `app/[locale]`, so the matched locale is rewritten into the path as the
 * first segment: `/products/x` -> `/en-us/products/x`, `fr.example.ca/products/x` ->
 * `/fr-ca/products/x`. The browser URL is untouched and `x-storefront-url` still carries it.
 *
 * Paths whose last segment has an extension (`/robots.txt`, `/sitemap.xml`, `public/` assets) are
 * root-level files, not pages, and pass through. Returns `undefined` when no rewrite is needed.
 */
export function toLocaleSegmentUrl(url: URL, locale: ShopifyMatchedLocale): URL | undefined {
  if (FILE_PATH_RE.test(url.pathname)) return undefined;

  const unprefixedPathname = url.pathname.slice(locale.pathPrefix.length) || "/";
  const segmentPath = `/${getLocalePathSegment(locale)}`;
  const internalPathname =
    unprefixedPathname === "/" ? segmentPath : `${segmentPath}${unprefixedPathname}`;
  if (internalPathname === url.pathname) return undefined;

  const internalUrl = new URL(url);
  internalUrl.pathname = internalPathname;
  return internalUrl;
}

/**
 * Under pathname routing the default locale is served unprefixed only. `/en-us/products/x` is
 * not a locale match (the default is not in `routing.locales`), so it would otherwise render as
 * a duplicate of `/products/x`. Returns the one canonical URL to redirect to, or `undefined`.
 */
export function toCanonicalDefaultUrl(
  url: URL,
  locale: ShopifyMatchedLocale,
  i18n: ShopifyI18n,
): URL | undefined {
  if (i18n.routing?.type !== "pathname" || locale.pathPrefix !== "") return undefined;

  const defaultPrefix = `/${getLocalePathSegment(i18n.defaultLocale)}`;
  const pathname = url.pathname.toLowerCase();
  if (pathname !== defaultPrefix && !pathname.startsWith(`${defaultPrefix}/`)) return undefined;

  const canonicalUrl = new URL(url);
  canonicalUrl.pathname = url.pathname.slice(defaultPrefix.length) || "/";
  return canonicalUrl;
}

const FILE_PATH_RE = /\/[^/]+\.[^/]+$/;
