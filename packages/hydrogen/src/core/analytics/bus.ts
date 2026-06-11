import { revalidateConnectedCartCheckoutUrls } from "../cart/cart";
import { createCartTracker } from "./cart-tracker";
import { initConsent } from "./consent";
import { initDeprecatedCookies } from "./deprecated-cookies";
import { createDestinationManager } from "./destination-manager";
import { AnalyticsEvent } from "./events";
import type {
  StorefrontAnalytics,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsOptions,
} from "./types";

function getHeadlessShopify() {
  const shopify = ((window as any).Shopify ??= {});
  return ((shopify as Shopify).headless ??= {});
}

function hasAnalyticsConsent(): boolean {
  try {
    const privacy = window.Shopify?.customerPrivacy;
    return privacy?.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * Creates a framework-agnostic analytics event bus.
 *
 * Each call creates an isolated pub/sub instance. Consent script loading
 * and customerPrivacy.config setup are coordinated by consent.ts.
 */
export function createStorefrontAnalytics(
  options: StorefrontAnalyticsOptions,
): StorefrontAnalytics {
  const { consent, canTrack: customCanTrack, customData, cookieDomain } = options;

  const { shop } = options;
  let destroyed = false;

  const subscribers = new Map<string, Map<string, (payload: any) => void>>();
  let nextSubscriberId = 0;
  let deprecatedCookiesReady = false;

  const canTrack = customCanTrack ?? hasAnalyticsConsent;

  function getConfig() {
    return {
      shop,
      consent,
      customData,
      cookieDomain,
    } satisfies StorefrontAnalyticsConfig;
  }

  // Tracking integrations (Shopify analytics CDN, third-party destinations) need consent
  // gating and event replay. subscribe() stays live-only; destinations go through here.
  const destinationManager = createDestinationManager({ canTrack, getConfig });

  function shouldLoadShopifyAnalytics(): boolean {
    return options.shopifyAnalytics !== false;
  }

  function publish(event: string, payload: any): void {
    if (destroyed) return;

    const eventSubscribers = subscribers.get(event) ?? new Map();
    eventSubscribers.forEach((callback, subscriberId) => {
      try {
        callback(payload);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Analytics publish error", error.message, subscriberId, error.stack);
        } else {
          console.error("Analytics publish error", error, subscriberId);
        }
      }
    });

    if (event === AnalyticsEvent.PAGE_VIEWED && deprecatedCookiesReady) {
      deprecatedCookies.syncPageView();
    }

    // Buffer the event and deliver to destinations when analytics consent allows.
    destinationManager.onPublish(event, payload);
  }

  function subscribe(event: string, callback: (payload: any) => void): () => void {
    let eventSubscribers = subscribers.get(event);
    if (!eventSubscribers) {
      eventSubscribers = new Map();
      subscribers.set(event, eventSubscribers);
    }
    const id = String(nextSubscriberId++);
    eventSubscribers.set(id, callback);
    return () => {
      subscribers.get(event)?.delete(id);
    };
  }

  const cartTracker = createCartTracker({
    publish,
    getShop: () => shop,
    getCustomData: () => customData,
  });

  const MOCK_SHOP_ID_SUFFIX = "/68817551382";

  let cleanupConsent: (() => void) | undefined;

  function initConsentModule() {
    if (typeof window === "undefined") return;

    cleanupConsent = initConsent({
      consent,
      onReady: () => {
        if (destroyed) return;
        deprecatedCookies.sync();
        deprecatedCookiesReady = true;
        // Consent is ready — flush any events destinations missed while blocked.
        destinationManager.replay();
      },
      onConsentCollected: ({ shouldRevalidate }) => {
        if (destroyed) return;
        deprecatedCookies.sync();
        deprecatedCookiesReady = true;
        if (shouldRevalidate) {
          revalidateConnectedCartCheckoutUrls();
        }
        // Replay on grant, or discard the buffer if analytics was explicitly denied.
        destinationManager.replay(true);
      },
    });
  }

  const deprecatedCookies =
    typeof window !== "undefined"
      ? initDeprecatedCookies({
          canTrack,
          consentDomain: consent.consentDomain,
          cookieDomain,
        })
      : { sync: () => {}, syncPageView: () => {} };

  function initBrowserDiscovery() {
    if (typeof window === "undefined") return;

    const bus = busInstance;
    getHeadlessShopify().analytics = bus;
  }

  function initShopifyAnalyticsModule() {
    if (typeof window === "undefined" || !shouldLoadShopifyAnalytics()) return;

    import("@shopify/hydrogen/cdn")
      .then(({ bootstrapShopifyAnalytics }) => {
        if (destroyed) return;
        bootstrapShopifyAnalytics(busInstance);
      })
      .catch(() => {});
  }

  function destroy() {
    destroyed = true;
    subscribers.clear();
    destinationManager.destroy(); // Tear down destination subscriptions and cleanup hooks.
    cleanupConsent?.();

    if (typeof window !== "undefined" && window.Shopify?.headless?.analytics === busInstance) {
      delete window.Shopify.headless.analytics;
    }
  }

  const busInstance: StorefrontAnalytics = {
    publish,
    subscribe,
    addDestination: destinationManager.addDestination, // Public API for consent-gated trackers.
    updateCart: cartTracker.updateCart,
    destroy,
    getConfig,
  };

  if (shop?.shopId?.endsWith(MOCK_SHOP_ID_SUFFIX)) {
    console.warn("[h2:warn:Analytics] Mock shop detected. Analytics will not work properly.");
  }

  initConsentModule();
  initBrowserDiscovery();
  initShopifyAnalyticsModule();

  return busInstance;
}
