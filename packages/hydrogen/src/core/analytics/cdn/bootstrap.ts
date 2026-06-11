import { AnalyticsEvent } from "../events";
import type { StorefrontAnalytics } from "../types";
import { createPerfKitProcessor } from "./perfkit";
import { createShopifyAnalyticsProcessor } from "./shopify-analytics";

const DESTINATION_NAME = "shopify-analytics";

export function bootstrapShopifyAnalytics(bus: StorefrontAnalytics) {
  const analytics = createShopifyAnalyticsProcessor();
  const perfkit = createPerfKitProcessor(bus.getConfig);

  bus.addDestination({
    name: DESTINATION_NAME,
    setup({ subscribe }) {
      for (const eventName of Object.values(AnalyticsEvent)) {
        if (eventName === AnalyticsEvent.CUSTOM_EVENT) continue;

        subscribe(eventName, (payload) => {
          perfkit.startLoading();
          analytics.handleEvent(eventName, payload);
          perfkit.handleEvent(eventName, payload);
        });
      }
    },
  });
}
