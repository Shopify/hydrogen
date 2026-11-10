import { defineShopifyRouteTemplates } from "@shopify/hydrogen";

export const routeTemplates = defineShopifyRouteTemplates({
  productInCollection: "/products/:productHandle",
});
