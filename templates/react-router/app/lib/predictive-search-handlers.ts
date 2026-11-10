import { createPredictiveSearchServerHandlers } from "@shopify/hydrogen";

// Mirrors the types the full /search page queries in app/lib/search.ts, so
// suggestions never offer what the fallback page cannot show.
export const predictiveSearchHandlers = createPredictiveSearchServerHandlers({
  types: ["PRODUCT"],
});
