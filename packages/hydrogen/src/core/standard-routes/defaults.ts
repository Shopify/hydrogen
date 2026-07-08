import type { ShopifyRouteTemplates, StandardRouteName, StandardRouteParamName } from "./types";

export const STANDARD_ROUTE_PARAM_NAMES = [
  "articleHandle",
  "blogHandle",
  "collectionHandle",
  "pageHandle",
  "productHandle",
] as const satisfies readonly StandardRouteParamName[];

export const DEFAULT_STANDARD_ROUTES = {
  product: "/products/:productHandle",
  collection: "/collections/:collectionHandle",
  page: "/pages/:pageHandle",
  blog: "/blogs/:blogHandle",
  article: "/blogs/:blogHandle/:articleHandle",
  productInCollection: "/collections/:collectionHandle/products/:productHandle",
} as const satisfies Required<ShopifyRouteTemplates>;

export function isStandardRouteParamName(name: string): name is StandardRouteParamName {
  return STANDARD_ROUTE_PARAM_NAMES.some((paramName) => paramName === name);
}

export function isStandardRouteName(name: string): name is StandardRouteName {
  return Object.hasOwn(DEFAULT_STANDARD_ROUTES, name);
}
