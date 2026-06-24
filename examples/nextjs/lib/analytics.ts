import { analyticsConsent, analyticsShop } from "@shared/config";
import {
  createStorefrontAnalytics,
  AnalyticsEvent,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

export { analyticsShop };

let bus: StorefrontAnalytics | null = null;

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  if (bus) return bus;

  bus = createStorefrontAnalytics({
    shop: analyticsShop,
    consent: analyticsConsent,
  });

  const events = [
    AnalyticsEvent.PAGE_VIEWED,
    AnalyticsEvent.PRODUCT_VIEWED,
    AnalyticsEvent.COLLECTION_VIEWED,
    AnalyticsEvent.CART_VIEWED,
    AnalyticsEvent.SEARCH_VIEWED,
  ] as const;

  for (const name of events) {
    bus.subscribe(name, (payload) => {
      // eslint-disable-next-line no-console
      console.log(`[analytics] ${name}`, payload);
    });
  }

  return bus;
}
