import { createShopifyRouteTemplates } from "@shopify/hydrogen";

// Canonicalize Shopify's collection-scoped product route to the product page
// this example handles. Add entries here if this example adopts custom
// product, collection, page, blog, or article paths.
export const routeTemplates = createShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});
