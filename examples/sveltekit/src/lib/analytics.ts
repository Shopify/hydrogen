import { browser } from "$app/environment";
import { AnalyticsEvent } from "@shopify/hydrogen";

export function getAnalytics() {
  if (!browser) return null;
  return window.Shopify?.analytics ?? null;
}

export function addAnalyticsConsoleDestination(): (() => void) | null {
  const analytics = getAnalytics();
  if (!analytics) return null;

  return analytics.addDestination({
    name: "example-console-logger",
    setup({ subscribe }) {
      const events = [
        AnalyticsEvent.PAGE_VIEWED,
        AnalyticsEvent.PRODUCT_VIEWED,
        AnalyticsEvent.COLLECTION_VIEWED,
        AnalyticsEvent.CART_VIEWED,
        AnalyticsEvent.SEARCH_VIEWED,
      ] as const;
      const unsubscribers = events.map((event) =>
        subscribe(event, (payload) => {
          console.log(`[analytics] ${event}`, payload);
        }),
      );

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  });
}

export { AnalyticsEvent };
