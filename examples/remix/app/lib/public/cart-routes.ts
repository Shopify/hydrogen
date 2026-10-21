import { localizePath } from "./i18n.ts";

/** Hydrogen's cart handler endpoint, registered through `handleShopifyRoutes`. */
export const CART_API_PATH = "/api/cart";

/**
 * The cart endpoint for the active locale. Localized carts go through the localized
 * endpoint so Storefront API mutations run with that locale's buyer context.
 */
export function cartApiPath(pathPrefix: string): string {
  return localizePath(CART_API_PATH, pathPrefix);
}
