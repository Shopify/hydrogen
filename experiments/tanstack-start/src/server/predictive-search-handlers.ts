import { createPredictiveSearchServerHandlers } from "@shopify/hydrogen";

// Serves `GET /api/predictive-search` through `handleShopifyRoutes`.
export const predictiveSearchHandlers = createPredictiveSearchServerHandlers({
  types: ["PRODUCT"],
});
