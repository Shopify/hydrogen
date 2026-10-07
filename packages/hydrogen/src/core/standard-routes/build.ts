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
 * Creates a typed map from Shopify standard storefront routes to your app's path templates.
 *
 * Pass the returned object anywhere Hydrogen needs your app's URL shape. That includes route and
 * redirect handling, the Shopify scripts `routes` option, and predictive search URL helpers.
 *
 * Each key names a Shopify standard route, and each value is your app's path template. Templates
 * start with `/` and include the handle placeholders for routes that identify a resource. Leave the
 * locale path prefix out of templates. Hydrogen applies the prefix when it resolves routes. Add a
 * key only when the app serves that route at a non-standard path. Hydrogen uses Shopify's default
 * path for each key that you leave out. Pass an empty object when the app serves every route at
 * its default path. The empty object gives the app one place to update if its routes change.
 *
 * When Hydrogen matches the current page, a standard storefront path keeps its standard page
 * template name, even when a custom template resolves another route to the same path. TypeScript
 * checks template shapes at compile time. At runtime, the function returns its argument unchanged.
 *
 * @param routes The non-standard route paths your app serves, keyed by standard route name.
 * @returns The same route templates object, typed for Hydrogen's routing and redirect helpers.
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
