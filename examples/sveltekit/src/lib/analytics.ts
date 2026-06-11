import { browser } from "$app/environment";
import { analyticsConsent, analyticsShop } from "@shared/config";
import {
  createStorefrontAnalytics,
  AnalyticsEvent,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { analyticsShop };

let bus: StorefrontAnalytics | null = null;

export function getAnalytics(): StorefrontAnalytics | null {
  if (!browser) return null;
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

  for (const event of events) {
    bus.subscribe(event, (payload) => {
      console.log(`[analytics] ${event}`, payload);
    });
  }

  return bus;
}

export { AnalyticsEvent };
