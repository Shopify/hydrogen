import { createShopifyRouteTemplates } from "@shopify/hydrogen";

export const routeTemplates = createShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});
