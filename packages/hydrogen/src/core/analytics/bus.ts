import { revalidateConnectedCartCheckoutUrls } from "../cart/cart";
import { getShopifyGlobal } from "../shopify-scripts";
import { SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT } from "../shopify-scripts/constants";
import { loadScript } from "../utils/load-script";
import { isObjectRecord } from "../utils/record";
import { createCartTracker } from "./cart-tracker";
import { initConsent } from "./consent";
import { initDeprecatedCookies } from "./deprecated-cookies";
import { createDestinationManager } from "./destination-manager";
import { AnalyticsEvent, type AnalyticsEventName } from "./events";
import type {
  StorefrontAnalytics,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsOptions,
  PayloadFor,
  PublishPayloadArgs,
} from "./types";

type AnalyticsCallback = (payload: unknown) => void;

const URL_INFERRED_EVENTS = new Set<AnalyticsEventName>([
  AnalyticsEvent.PAGE_VIEWED,
  AnalyticsEvent.PRODUCT_VIEWED,
  AnalyticsEvent.COLLECTION_VIEWED,
  AnalyticsEvent.CART_VIEWED,
  AnalyticsEvent.SEARCH_VIEWED,
]);

const SUPPORTED_ANALYTICS_EVENTS = new Set<AnalyticsEventName>(Object.values(AnalyticsEvent));

function getCurrentUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.href;
}

function hasOwnProperty(object: Record<string, unknown>, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function withDefaultShop<E extends AnalyticsEventName>(
  payload: PayloadFor<E>,
  shop: StorefrontAnalyticsConfig["shop"],
): PayloadFor<E> {
  if (!isObjectRecord(payload) || hasOwnProperty(payload, "shop")) return payload;

  return { ...payload, shop };
}

function withInferredUrl<E extends AnalyticsEventName>(
  event: E,
  payload: PayloadFor<E>,
): PayloadFor<E> {
  if (!URL_INFERRED_EVENTS.has(event) || !isObjectRecord(payload)) return payload;

  if (typeof payload.url === "string" && payload.url.length > 0) return payload;

  const url = getCurrentUrl();
  if (!url) return payload;

  return { ...payload, url };
}

function hasAnalyticsConsent(): boolean {
  try {
    const privacy = window.Shopify?.customerPrivacy;
    return privacy?.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

function isSupportedAnalyticsEvent(event: unknown): event is AnalyticsEventName {
  return typeof event === "string" && SUPPORTED_ANALYTICS_EVENTS.has(event as AnalyticsEventName);
}

function warnUnsupportedAnalyticsEvent(event: unknown): void {
  console.warn(`[h3:warn:Analytics] Unsupported analytics event "${String(event)}".`);
}

function getPublishPayload<E extends AnalyticsEventName>(
  payload: PayloadFor<E> | undefined,
): PayloadFor<E> {
  if (payload !== undefined) return payload;

  return {} as PayloadFor<E>;
}

/**
 * Creates a framework-agnostic analytics event bus.
 *
 * Only one instance may exist at a time. Call destroy() before re-initializing.
 */
export function createStorefrontAnalytics(
  options: StorefrontAnalyticsOptions,
): StorefrontAnalytics {
  if (typeof window !== "undefined" && window.Shopify?.analytics) {
    throw new Error(
      "Analytics bus already initialized. Only one createStorefrontAnalytics() instance is allowed. Call destroy() first to re-initialize.",
    );
  }

  const { consent, canTrack: customCanTrack, customData, cookieDomain } = options;

  const { shop } = options;
  let destroyed = false;

  const subscribers = new Map<string, Map<string, AnalyticsCallback>>();
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
  const destinationManager = createDestinationManager({
    canTrack,
    getConfig,
    isSupportedEvent: isSupportedAnalyticsEvent,
    warnUnsupportedEvent: warnUnsupportedAnalyticsEvent,
  });

  function publish<E extends AnalyticsEventName>(
    event: E,
    ...payloadArgs: PublishPayloadArgs<E>
  ): void {
    if (destroyed) return;
    if (!isSupportedAnalyticsEvent(event)) {
      warnUnsupportedAnalyticsEvent(event);
      return;
    }

    const payload = getPublishPayload(payloadArgs[0]);
    const normalizedPayload = withInferredUrl(event, withDefaultShop(payload, shop));
    const eventSubscribers = subscribers.get(event) ?? new Map();
    eventSubscribers.forEach((callback, subscriberId) => {
      try {
        callback(normalizedPayload);
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
    destinationManager.onPublish(event, normalizedPayload);
  }

  function subscribe<E extends AnalyticsEventName>(
    event: E,
    callback: (payload: PayloadFor<E>) => void,
  ): () => void {
    if (!isSupportedAnalyticsEvent(event)) {
      warnUnsupportedAnalyticsEvent(event);
      return () => {};
    }
    let eventSubscribers = subscribers.get(event);
    if (!eventSubscribers) {
      eventSubscribers = new Map();
      subscribers.set(event, eventSubscribers);
    }
    const id = String(nextSubscriberId++);
    eventSubscribers.set(id, callback as AnalyticsCallback);
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
    const shopify = getShopifyGlobal();
    if (!shopify) return;

    shopify.analytics = bus;
  }

  function initShopifyAnalyticsModule() {
    if (typeof window === "undefined" || options.shopifyAnalytics === false) return;

    loadScript(SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT, {
      attributes: { crossorigin: "anonymous" },
    }).catch(() => {
      console.warn(
        "[h2:warn:Analytics] Failed to load Shopify analytics CDN script. Analytics events will not be forwarded.",
      );
    });
  }

  function destroy() {
    destroyed = true;
    subscribers.clear();
    destinationManager.destroy(); // Tear down destination subscriptions and cleanup hooks.
    cleanupConsent?.();

    if (typeof window !== "undefined" && window.Shopify?.analytics === busInstance) {
      delete window.Shopify.analytics;
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
