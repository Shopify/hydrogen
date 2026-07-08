import type { StorefrontAnalyticsDestinationSetupContext } from "../analytics/types";
import { SHOPIFY_PERF_KIT_SCRIPT } from "./constants";
import type { ShopifyScriptDescriptor, ShopifyScriptsShop } from "./types";

const SHOPIFY_SHOP_ID_PATTERN = /^\d+$/;

export function getPerfKitScript(
  shop: ShopifyScriptsShop | null | undefined,
): ShopifyScriptDescriptor | undefined {
  if (!shop?.storefrontId) return;

  const shopId = normalizeShopifyShopId(shop.shopId);
  if (!shopId) return;

  return {
    tagName: "script",
    attributes: {
      id: "perfkit",
      async: true,
      src: SHOPIFY_PERF_KIT_SCRIPT,
      "data-application": "hydrogen",
      "data-shop-id": shopId,
      "data-storefront-id": shop.storefrontId,
      "data-monorail-region": "global",
      "data-spa-mode": "true",
      "data-resource-timing-sampling-rate": "10",
    },
  };
}

export function getPerfKitSpaBridgeScript(nonce: string | undefined): ShopifyScriptDescriptor {
  return {
    tagName: "script",
    attributes: nonce ? { nonce } : undefined,
    innerHTML: `(${initPerfKitSpaBridge.toString()})();`,
  };
}

/**
 * Initializes PerfKit SPA navigation tracking in the browser.
 *
 * This function is stringified with `.toString()` and inlined into SSR HTML, so its runtime body
 * must stay self-contained. Do not reference module variables, imported values, or anything else
 * from the outer scope.
 */
function initPerfKitSpaBridge() {
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

  function attach() {
    const bus = window.Shopify?.analytics;
    if (typeof bus?.addDestination !== "function") return;

    bus.addDestination({
      name: destinationName,
      setup: setupPerfKitSpaBridge,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
    return;
  }

  attach();
}

function normalizeShopifyShopId(shopId: string): string | undefined {
  const parsedShopId = shopId.split("/").pop();
  if (!parsedShopId) return;

  return SHOPIFY_SHOP_ID_PATTERN.test(parsedShopId) ? parsedShopId : undefined;
}
