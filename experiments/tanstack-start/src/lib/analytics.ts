import { shop } from "@shared/config";
import { AnalyticsEvent, type ShopAnalytics, type StorefrontAnalytics } from "@shopify/hydrogen";

export { AnalyticsEvent };

// Same identity `ShopifyScripts` derives for the analytics bus from `shop`.
export const analyticsShop: ShopAnalytics = {
  shopId: shop.shopId,
  channel: "hydrogen",
  storefrontId: shop.storefrontId,
};

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null;
  return window.Shopify?.analytics ?? null;
}

export function addAnalyticsConsoleDestination(): (() => void) | null {
  const analytics = getAnalytics();
  if (!analytics) return null;

  return analytics.addDestination({
    name: "experiment-console-logger",
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
          // eslint-disable-next-line no-console -- the console is this destination's sink
          console.log(`[analytics] ${event}`, payload);
        }),
      );

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    },
  });
}
