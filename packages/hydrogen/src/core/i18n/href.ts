import { isAbsoluteUrl } from "../standard-routes/path";
import { formatLocale, getLocalePathSegment, getSupportedLocales, isSameLocale } from "./define";
import type { ShopifyI18n, ShopifyLocale } from "./types";

const RELATIVE_URL_BASE = "https://shopify.local";

export type GetLocalizedHrefOptions = {
  i18n: ShopifyI18n;
  /** Target locale. Must be one of the definition's supported locales. */
  locale: ShopifyLocale;
};

/**
 * Rewrites an href so it points at the same page in another locale.
 *
 * The result is always valid for `href` or a `Location` header, but its shape follows the routing
 * strategy:
 * - pathname routing returns a path (`/fr-ca/products/x`); any existing locale prefix is replaced.
 * - domain routing returns an absolute URL on the target locale's hostname.
 * - no routing returns the href unchanged.
 *
 * Absolute inputs keep their scheme; relative inputs stay relative under pathname routing and use
 * `https:` under domain routing.
 *
 * @throws when `locale` is not defined in `i18n`.
 */
export function getLocalizedHref(href: string, { i18n, locale }: GetLocalizedHrefOptions): string {
  const routing = i18n.routing;
  if (!routing) return href;

  const absolute = isAbsoluteUrl(href);
  const url = new URL(href, RELATIVE_URL_BASE);

  switch (routing.type) {
    case "pathname": {
      const target = isSameLocale(locale, i18n.defaultLocale)
        ? undefined
        : routing.locales.find((candidate) => isSameLocale(candidate, locale));
      if (!target && !isSameLocale(locale, i18n.defaultLocale))
        throw unsupportedLocale(locale, i18n);

      const knownSegments = routing.locales.map(getLocalePathSegment);
      const unprefixedPathname = stripLocaleSegment(url.pathname, knownSegments);
      url.pathname = target
        ? `/${getLocalePathSegment(target)}${unprefixedPathname}`
        : unprefixedPathname;

      return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
    }
    case "domain": {
      const target = routing.locales.find((candidate) => isSameLocale(candidate, locale));
      if (!target) throw unsupportedLocale(locale, i18n);

      url.hostname = target.hostname.toLowerCase();
      url.port = "";
      if (!absolute) url.protocol = "https:";

      return url.toString();
    }
    default:
      routing satisfies never;
      return href;
  }
}

function stripLocaleSegment(pathname: string, knownSegments: readonly string[]): string {
  const [segment = "", ...rest] = pathname.replace(/^\/+/, "").split("/");
  if (segment === "" || !knownSegments.includes(segment.toLowerCase())) return pathname;

  return `/${rest.join("/")}`;
}

function unsupportedLocale(locale: ShopifyLocale, i18n: ShopifyI18n): Error {
  const supported = getSupportedLocales(i18n).map(formatLocale).join(", ");
  return new Error(
    `getLocalizedHref: locale ${formatLocale(locale)} is not defined in this storefront's i18n. Supported locales: ${supported}.`,
  );
}
