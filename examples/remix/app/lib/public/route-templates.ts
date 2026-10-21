import { createShopifyRouteTemplates } from "@shopify/hydrogen";

/**
 * Shopify's standard storefront paths, shared by the browser-side Shopify scripts,
 * `handleShopifyRoutes`, and `handleShopifyRedirects`. Collection-scoped product URLs
 * canonicalize to the app's single product route.
 */
export const routeTemplates = createShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});
