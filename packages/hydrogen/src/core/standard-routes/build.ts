import { DEFAULT_STANDARD_ROUTES, isStandardRouteParamName } from "./defaults";
import { prependPathPrefix } from "./path";
import type {
  ShopifyRouteTemplates,
  StandardRouteName,
  StandardRouteOptions,
  StandardRouteParams,
  StandardRouteParamsByName,
} from "./types";

/**
 * Tells Hydrogen where your app serves products, collections, and other Shopify resources. Pass
 * the returned object to handleShopifyRoutes, handleShopifyRedirects, the ShopifyScripts `routes`
 * option, and the predictive search URL helpers.
 *
 * Add a key only for a route that your app serves at a non-standard path. Hydrogen uses Shopify's
 * default path for each key that you leave out. Pass an empty object when your app serves every
 * route at its default path. Each template starts with `/` and includes the handle placeholders
 * for its route. Leave the locale path prefix out of templates. Hydrogen adds the prefix for you.
 *
 * TypeScript checks the shape of each template. The function returns the object that you pass.
 *
 * @param routes The non-standard paths that your app serves, keyed by standard route name.
 * @returns The route templates, typed for Hydrogen's route, redirect, and URL helpers.
 * @example
 * ```ts
 * const routeTemplates = createShopifyRouteTemplates({
 *   product: "/p/:productHandle",
 *   collection: "/c/:collectionHandle",
 *   article: "/journal/:blogHandle/:articleHandle",
 *   cart: "/basket",
 *   policy: "/legal/:policyHandle",
 * });
 * ```
 * @publicDocs
 */
export function createShopifyRouteTemplates<const TRoutes extends ShopifyRouteTemplates>(
  routes: TRoutes,
): TRoutes {
  return routes;
}

export function getStandardRoute<const TRoute extends StandardRouteName>(
  routeTemplates: ShopifyRouteTemplates,
  route: TRoute,
  params: StandardRouteParamsByName[TRoute],
  options: StandardRouteOptions = {},
): string {
  const target = routeTemplates[route] ?? DEFAULT_STANDARD_ROUTES[route][0];

  return buildStandardRouteTarget(target, params, options.pathPrefix);
}

/**
 * Builds a pathname from a route template, handle params, and optional i18n path prefix.
 */
export function buildStandardRouteTarget(
  template: string,
  params: StandardRouteParams,
  pathPrefix: string | undefined,
): string {
  return prependPathPrefix(interpolateRouteTemplate(template, params), pathPrefix);
}

function interpolateRouteTemplate(template: string, params: StandardRouteParams): string {
  return template.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (placeholder, name: string) => {
    if (!isStandardRouteParamName(name)) return placeholder;

    const value = params[name];
    return value === undefined ? placeholder : encodeURIComponent(value);
  });
}
