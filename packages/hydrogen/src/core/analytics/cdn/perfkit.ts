import { loadScript } from "../../utils/load-script";
import { AnalyticsEvent } from "../events";
import type { StorefrontAnalyticsConfig } from "../types";
import { parseGid } from "./utils/parse-gid";

const PERF_KIT_URL = "https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-3.5.2.min.js";

export function createPerfKitProcessor(getConfig: () => StorefrontAnalyticsConfig) {
  let scriptLoaded = false;
  let loading = false;
  const pendingEvents: Array<{ event: string; payload: unknown }> = [];

  function startLoading() {
    const config = getConfig();
    if (loading || scriptLoaded || !config.shop) return;
    loading = true;

    loadScript(PERF_KIT_URL, {
      attributes: {
        id: "perfkit",
        "data-application": "hydrogen",
        "data-shop-id": parseGid(config.shop.shopId).id.toString(),
        "data-storefront-id": config.shop.hydrogenSubchannelId,
        "data-monorail-region": "global",
        "data-spa-mode": "true",
        "data-resource-timing-sampling-rate": "100",
      },
    })
      .then(() => {
        scriptLoaded = true;
        const queued = pendingEvents.splice(0);
        for (const { event } of queued) {
          dispatchToPerfKit(event);
        }
      })
      .catch(() => {
        pendingEvents.length = 0;
      });
  }

  function dispatchToPerfKit(event: string) {
    switch (event) {
      case AnalyticsEvent.PAGE_VIEWED:
        window.PerfKit?.navigate();
        break;
      case AnalyticsEvent.PRODUCT_VIEWED:
        window.PerfKit?.setPageType("product");
        break;
      case AnalyticsEvent.COLLECTION_VIEWED:
        window.PerfKit?.setPageType("collection");
        break;
      case AnalyticsEvent.SEARCH_VIEWED:
        window.PerfKit?.setPageType("search");
        break;
      case AnalyticsEvent.CART_VIEWED:
        window.PerfKit?.setPageType("cart");
        break;
    }
  }

  return {
    startLoading,
    handleEvent(event: string, payload: unknown) {
      const config = getConfig();
      if (!config.shop) return;

      if (!scriptLoaded) {
        pendingEvents.push({ event, payload });
        return;
      }

      dispatchToPerfKit(event);
    },
  };
}
