import type { StorefrontAnalyticsDestinationSetupContext } from "../analytics/types";

export default function initPerfKitSpaBridge() {
  type DestinationSubscribe = StorefrontAnalyticsDestinationSetupContext["subscribe"];

  const destinationName = "perfkit-spa-bridge";
  const pageViewedEventName = "page_viewed";
  const pageTypeSubscriptions = [
    ["product_viewed", "product"],
    ["collection_viewed", "collection"],
    ["search_viewed", "search"],
    ["cart_viewed", "cart"],
  ] as const;

  function setupPerfKitSpaBridge({ subscribe }: { subscribe: DestinationSubscribe }) {
    subscribe(pageViewedEventName, () => {
      window.PerfKit?.navigate?.();
    });

    for (const [eventName, pageType] of pageTypeSubscriptions) {
      subscribe(eventName, () => {
        window.PerfKit?.setPageType?.(pageType);
      });
    }
  }

  let attached = false;

  function attach() {
    if (attached) return true;

    const bus = window.Shopify?.analytics;
    if (typeof bus?.addDestination !== "function") return false;

    bus.addDestination({
      name: destinationName,
      setup: setupPerfKitSpaBridge,
    });
    attached = true;
    return true;
  }

  if (attach()) return;

  // The bus is inline today, but if it moves to a module/defer script it will
  // still be available before DOMContentLoaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  }
}
