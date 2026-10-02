import { setupStorefrontAnalytics } from "../bus";
import type { StorefrontAnalyticsConfig } from "../types";

export default function initializeShopifyAnalyticsBus(
  config: StorefrontAnalyticsConfig | undefined,
) {
  if (config) {
    setupStorefrontAnalytics(config);
  }
}
