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
 * Creates a typed map of custom route templates for Shopify standard resource routes.
 *
 * Use the returned object anywhere Hydrogen needs to understand the app's URL shape for
 * Shopify resources: `handleShopifyRedirects({routeTemplates})`, `ShopifyScripts`
 * `routes={routeTemplates}`, and predictive search URL helpers.
 *
 * Each key represents a Shopify standard route identity, while each value is the app's custom
 * pathname template for that resource. Templates must start with `/` and include the required
 * named handle placeholders for the selected resource. Do not include an i18n path prefix in the
 * template; Hydrogen applies `i18n.pathPrefix` separately when resolving routes. Pass an empty
 * object when the app uses Shopify's default resource paths so there is still one app-owned routing
 * manifest to update if routes change later.
 *
 * @example
 * ```ts
 * const routeTemplates = createShopifyRouteTemplates({
 *   product: "/p/:productHandle",
 *   collection: "/c/:collectionHandle",
 *   article: "/journal/:blogHandle/:articleHandle",
 * });
 * ```
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
  const target = routeTemplates[route] ?? DEFAULT_STANDARD_ROUTES[route];

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
