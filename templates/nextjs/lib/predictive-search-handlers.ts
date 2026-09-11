import { createPredictiveSearchServerHandlers } from "@shopify/hydrogen";

/**
 * Predictive search server handlers, registered in the root middleware's
 * `handleShopifyRoutes` wiring. The browser autocomplete endpoint is
 * `/api/predictive-search` by default. Limited to products per
 * `notes/predictive-search.md`.
 */
export const predictiveSearchHandlers = createPredictiveSearchServerHandlers({
  types: ["PRODUCT"],
});
