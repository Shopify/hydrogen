import type { RouteConfigEntry } from "@react-router/dev/routes";
import { getSupportedLocales, resolveSupportedLocale, type ShopifyI18n } from "@shopify/hydrogen";

// Crawlers read these from the host root only, so a locale copy would be a stray duplicate.
const ROOT_ONLY_PATHS = new Set(["robots.txt"]);

/**
 * Serves every route under each pathname-routed locale's prefix as well as unprefixed.
 *
 * The prefixes are static segments rather than a `:locale?` param, so an unknown or
 * default-locale prefix (`/xx/...`, `/en-us/...`) matches no page and falls through to the 404
 * splat, and a handle such as `/collections/cart` can never be mistaken for `/:locale/cart`.
 * Single-locale and domain-routed definitions have no prefixes and get the routes unchanged.
 */
export function addLocaleRoutes(routes: RouteConfigEntry[], i18n: ShopifyI18n): RouteConfigEntry[] {
  const localizable = routes.filter((route) => !ROOT_ONLY_PATHS.has(route.path ?? ""));
  return [
    ...routes,
    ...getLocalePathPrefixes(i18n).flatMap((pathPrefix) =>
      prefixRoutes(localizable, pathPrefix, true),
    ),
  ];
}

/**
 * The id of a route's copy under a locale prefix. Route ids must be unique, so each copy gets
 * its own; look loader data up through this rather than a hard-coded id.
 */
export function getLocalizedRouteId(routeId: string, pathPrefix: string): string {
  return pathPrefix ? `${pathPrefix.slice(1)}/${routeId}` : routeId;
}

function getLocalePathPrefixes(i18n: ShopifyI18n): string[] {
  return getSupportedLocales(i18n)
    .map((locale) => resolveSupportedLocale(locale, i18n).pathPrefix)
    .filter((pathPrefix) => pathPrefix !== "");
}

// Mirrors `prefix()` from `@react-router/dev/routes`: only the outermost route with a path gets
// the segment, because child paths are relative to it. Every descendant still needs a new id.
function prefixRoutes(
  routes: RouteConfigEntry[],
  pathPrefix: string,
  prefixPaths: boolean,
): RouteConfigEntry[] {
  const segment = pathPrefix.slice(1);
  return routes.map((route) => {
    const prefixed = prefixPaths && (route.index === true || typeof route.path === "string");
    return {
      ...route,
      id: getLocalizedRouteId(route.id ?? route.file.replace(/\.[^/.]+$/, ""), pathPrefix),
      ...(prefixed ? { path: route.path ? `${segment}/${route.path}` : segment } : {}),
      ...(route.children
        ? { children: prefixRoutes(route.children, pathPrefix, prefixPaths && !prefixed) }
        : {}),
    };
  });
}
