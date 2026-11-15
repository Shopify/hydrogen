import type { ShopifyLocale } from "@shopify/hydrogen";
import { useLocale } from "@shopify/hydrogen/react";

/**
 * Returns a function that keeps an app path, such as `/collections`, in the page's locale.
 *
 * Hydrogen serves one locale per page load, so every internal link and request carries the
 * locale's path prefix. A link without it sends the customer to the default locale.
 */
export function useLocalizedPath(): (path: string) => string {
  const { pathPrefix } = useLocale();
  return (path) => localizePath(path, pathPrefix);
}

/** Puts an app path under a locale path prefix. External URLs are returned unchanged. */
export function localizePath(path: string, pathPrefix: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;

  // The locale root is `/fr-ca`, not `/fr-ca/`, so it has one canonical URL.
  return path === "/" ? pathPrefix || "/" : `${pathPrefix}${path}`;
}

/**
 * Returns a function that keeps the path of a menu item in the page's locale.
 *
 * Menu URLs from the Storefront API carry the Online Store's own locale prefix for the request's
 * language, such as `/fr`. This app serves each locale under its own prefix instead, so the
 * Online Store's prefix has to go before the app adds its own.
 */
export function useLocalizedMenuPath(): (path: string) => string {
  const locale = useLocale();
  return (path) => localizePath(stripOnlineStoreLocalePrefix(path, locale), locale.pathPrefix);
}

function stripOnlineStoreLocalePrefix(path: string, { language, country }: ShopifyLocale): string {
  const languageSegment = language.toLowerCase().replace("_", "-");
  const localePrefix = [`/${languageSegment}-${country.toLowerCase()}`, `/${languageSegment}`].find(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return localePrefix ? path.slice(localePrefix.length) || "/" : path;
}
