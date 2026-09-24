import { consoleLogger } from "../logging";
import {
  CONSENT_TRACKING_API_LOADED_EVENT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts/constants";
import { getShopifyGlobal } from "../shopify-scripts/global";
import { isObjectRecord } from "../utils/record";
import { CUSTOM_CONSENT } from "./custom-consent";
import { createDestinationManager } from "./destination-manager";
import { AnalyticsEvent, type AnalyticsEventName } from "./events";
import type {
  ConsentSetup,
  StorefrontAnalytics,
  StorefrontAnalyticsConfig,
  PayloadFor,
  PublishPayloadArgs,
} from "./types";
import { normalizeShopAnalytics } from "./utils/shop";

type AnalyticsCallback = (payload: unknown) => void;

const URL_INFERRED_EVENTS = new Set<string>([
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
  if (!isObjectRecord(payload)) return payload;

  if (hasOwnProperty(payload, "shop")) {
    return {
      ...payload,
      shop: normalizeShopAnalytics((payload as { shop?: StorefrontAnalyticsConfig["shop"] }).shop),
    };
  }

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
    if (privacy?.consentStatus !== "loaded") return false;

    const currentVisitorConsent = privacy.currentVisitorConsent?.();
    if (isObjectRecord(currentVisitorConsent) && currentVisitorConsent.analytics === "no") {
      return false;
    }

    return privacy?.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

function isSupportedAnalyticsEvent(event: unknown): event is AnalyticsEventName {
  return typeof event === "string" && SUPPORTED_ANALYTICS_EVENTS.has(event as AnalyticsEventName);
}

function warnUnsupportedAnalyticsEvent(event: unknown): void {
  consoleLogger.warn(`unsupported analytics event "${String(event)}"`, { scope: "analytics" });
}

// Only Shopify's privacy-banner has known pre-interaction initial state:
// it may call setTrackingConsent once to hydrate consent state, then again
// after the shopper accepts or declines. Custom banners instead synchronize
// their provider's resolved choice through Shopify.customerPrivacy during setup.
function shouldWaitForDefaultBannerInteraction(): boolean {
  try {
    const privacy = window.Shopify?.customerPrivacy;
    if (typeof privacy?.shouldShowGDPRBanner !== "function") return true;

    return privacy.shouldShowGDPRBanner();
  } catch {
    return true;
  }
}

function getPublishPayload<E extends AnalyticsEventName>(
  payload: PayloadFor<E> | undefined,
): PayloadFor<E> {
  if (payload !== undefined) return payload;

  return {} as PayloadFor<E>;
}

/**
 * Sets up a framework-agnostic analytics event bus.
 *
 * Only one instance may exist at a time — the CDN analytics script binds to
 * the global bus reference on first load and won't re-bind to a replacement.
 * Call destroy() before re-initializing.
 */
export function setupStorefrontAnalytics(options: StorefrontAnalyticsConfig): StorefrontAnalytics {
  if (typeof window !== "undefined" && window.Shopify?.analytics) {
    throw new Error(
      "Analytics bus already initialized. Only one setupStorefrontAnalytics() instance is allowed. Call destroy() first to re-initialize.",
    );
  }

  const { consent, customData } = options;
  const usesDefaultBanner = consent?.mode === "default-banner";
  const usesCustomBanner = consent?.mode === "custom-banner";
  let consentReady = !usesCustomBanner && !usesDefaultBanner;

  const shop = normalizeShopAnalytics(options.shop);
  let destroyed = false;

  const subscribers = new Map<string, Map<string, AnalyticsCallback>>();
  let nextSubscriberId = 0;

  function getConfig() {
    return {
      shop,
      consent,
      customData,
    } satisfies StorefrontAnalyticsConfig;
  }

  // Tracking integrations (Shopify analytics CDN, third-party destinations) need consent
  // gating and event replay. subscribe() stays live-only; destinations go through here.
  const destinationManager = createDestinationManager({
    canTrack: () => consentReady && hasAnalyticsConsent(),
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
        consoleLogger.error("analytics publish error", { scope: "analytics", error, subscriberId });
      }
    });

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

  const MOCK_SHOP_ID_SUFFIX = "/68817551382";

  let cleanupConsentReplay: (() => void) | undefined;

  function initConsentReplay() {
    if (typeof document === "undefined") return;

    let customSetup: ConsentSetup | undefined;
    let initializationStarted = false;

    const completeConsent = () => {
      if (destroyed) return;
      consentReady = true;
      destinationManager.replay(true);
    };

    // oxlint-disable-next-line complexity -- Keep the distinct consent-mode replay rules together.
    const onConsentLoaded = async () => {
      if (destroyed || window.Shopify?.customerPrivacy?.consentStatus !== "loaded") return;

      if (usesCustomBanner) {
        if (!customSetup || initializationStarted) return;
        initializationStarted = true;
        try {
          await customSetup();
          completeConsent();
        } catch (error) {
          consoleLogger.error("custom consent setup failed", { scope: "consent", error });
        }

        return;
      }

      if (usesDefaultBanner || isObjectRecord(window.privacyBanner)) {
        if (initializationStarted) {
          // Refresh replay recording without reopening the banner interaction gate.
          destinationManager.replay();
          return;
        }

        initializationStarted = true;
        if (shouldWaitForDefaultBannerInteraction()) {
          consentReady = false;
          return;
        }

        completeConsent();
        return;
      }

      // Without a banner, initial readiness preserves buffered events until consent allows them.
      destinationManager.replay();
    };

    const replayConsentEvent = () => {
      if (destroyed) return;
      if (usesCustomBanner) {
        // A successful write can provide readiness after CTA's initial consent request failed,
        // but custom consent must still wait for the merchant's setup promise.
        void onConsentLoaded();
        if (!consentReady) return;
      }

      // The banner has saved a choice, even if initial readiness never fired.
      // Later readiness events must not put it back into a waiting state.
      initializationStarted = true;
      completeConsent();
    };

    if (usesCustomBanner) {
      Object.defineProperty(busInstance, CUSTOM_CONSENT, {
        value(setup: ConsentSetup) {
          customSetup ??= setup;

          void onConsentLoaded();
        },
      });
    }

    document.addEventListener(CONSENT_TRACKING_API_LOADED_EVENT, onConsentLoaded);
    document.addEventListener(VISITOR_CONSENT_COLLECTED_EVENT, replayConsentEvent);

    // Catch up if consent became ready before this listener attached.
    void onConsentLoaded();

    cleanupConsentReplay = () => {
      document.removeEventListener(CONSENT_TRACKING_API_LOADED_EVENT, onConsentLoaded);
      document.removeEventListener(VISITOR_CONSENT_COLLECTED_EVENT, replayConsentEvent);
    };
  }

  function initBrowserDiscovery() {
    if (typeof window === "undefined") return;

    const bus = busInstance;
    const shopify = getShopifyGlobal();
    if (!shopify) return;

    shopify.analytics = bus;
  }

  function destroy() {
    destroyed = true;
    subscribers.clear();
    destinationManager.destroy(); // Tear down destination subscriptions and cleanup hooks.
    cleanupConsentReplay?.();

    if (typeof window !== "undefined" && window.Shopify?.analytics === busInstance) {
      delete window.Shopify.analytics;
    }
  }

  const busInstance: StorefrontAnalytics = {
    publish,
    subscribe,
    addDestination: destinationManager.addDestination, // Public API for consent-gated trackers.
    destroy,
    getConfig,
  };

  if (shop?.shopId && String(shop.shopId).endsWith(MOCK_SHOP_ID_SUFFIX)) {
    consoleLogger.warn("mock shop detected; analytics will not work properly", {
      scope: "analytics",
    });
  }

  initConsentReplay();
  initBrowserDiscovery();

  return busInstance;
}
