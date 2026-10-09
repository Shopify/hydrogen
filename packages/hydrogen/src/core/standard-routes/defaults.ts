import type { ShopifyRouteTemplates, StandardRouteName, StandardRouteParamName } from "./types";

type DefaultStandardRoutes = {
  [Route in StandardRouteName]: readonly [
    NonNullable<ShopifyRouteTemplates[Route]>,
    ...NonNullable<ShopifyRouteTemplates[Route]>[],
  ];
};

const STANDARD_ROUTE_PARAM_NAMES = [
  "articleHandle",
  "blogHandle",
  "collectionHandle",
  "pageHandle",
  "policyHandle",
  "productHandle",
] as const satisfies readonly StandardRouteParamName[];

export const DEFAULT_STANDARD_ROUTES = {
  product: ["/products/:productHandle"],
  collection: ["/collections/:collectionHandle"],
  collectionList: ["/collections", "/products"],
  page: ["/pages/:pageHandle"],
  policy: ["/policies/:policyHandle"],
  blog: ["/blogs/:blogHandle"],
  article: ["/blogs/:blogHandle/:articleHandle"],
  productInCollection: ["/collections/:collectionHandle/products/:productHandle"],
  cart: ["/cart"],
  search: ["/search"],
} as const satisfies DefaultStandardRoutes;

export function isStandardRouteParamName(name: string): name is StandardRouteParamName {
  return STANDARD_ROUTE_PARAM_NAMES.some((paramName) => paramName === name);
}

export function isStandardRouteName(name: string): name is StandardRouteName {
  return Object.hasOwn(DEFAULT_STANDARD_ROUTES, name);
}
