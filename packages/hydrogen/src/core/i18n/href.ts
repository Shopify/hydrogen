import { isAbsoluteUrl, stripI18nPathPrefix } from "../standard-routes/path";
import { matchLocale, resolveSupportedLocale } from "./match";
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
  const target = resolveSupportedLocale(locale, i18n);

  switch (routing.type) {
    case "pathname": {
      const current = matchLocale(url, i18n);
      const unprefixedPathname = stripI18nPathPrefix(url.pathname, current.pathPrefix);
      // Keep the locale root free of a trailing slash so `/fr-ca` stays the one canonical URL.
      url.pathname =
        unprefixedPathname === "/"
          ? target.pathPrefix || "/"
          : `${target.pathPrefix}${unprefixedPathname}`;

      return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
    }
    case "domain": {
      // Define-time validation guarantees every domain-routed locale carries a hostname.
      if (!("hostname" in target) || typeof target.hostname !== "string") {
        throw new Error(
          `getLocalizedHref: locale ${target.language}-${target.country} has no hostname under domain routing.`,
        );
      }
      url.hostname = target.hostname;
      url.port = "";
      if (!absolute) url.protocol = "https:";

      return url.toString();
    }
    default:
      routing satisfies never;
      return href;
  }
}
