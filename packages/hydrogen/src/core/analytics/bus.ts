import { consoleLogger } from "../logging";
import {
  CONSENT_TRACKING_API_LOADED_EVENT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts/constants";
import { getShopifyGlobal } from "../shopify-scripts/global";
import { isObjectRecord } from "../utils/record";
import { createDestinationManager } from "./destination-manager";
import { AnalyticsEvent, type AnalyticsEventName } from "./events";
import type {
  StorefrontAnalytics,
  StorefrontAnalyticsConfig,
  PayloadFor,
  PublishPayloadArgs,
} from "./types";
import { normalizeShopAnalytics } from "./utils/shop";

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
// after the shopper accepts or declines. Custom banners also may call
// setTrackingConsent later, but Hydrogen does not own or observe their UI
// lifecycle, so their initial event must be treated as actionable consent.
function shouldWaitForDefaultBannerInteraction(usesDefaultBanner: boolean): boolean {
  try {
    if (!usesDefaultBanner && !isObjectRecord(window.privacyBanner)) return false;

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
 * The bus lives for the page's lifetime — the CDN analytics script binds to
 * the global bus reference on first load and won't re-bind to a replacement.
 * Teardown is returned separately for internal use, such as test isolation.
 */
export function setupStorefrontAnalytics(options: StorefrontAnalyticsConfig) {
  if (typeof window !== "undefined" && window.Shopify?.analytics) {
    throw new Error("Analytics bus already initialized. Only one instance is allowed per page.");
  }

  const { consent, customData } = options;
  const usesDefaultBanner = consent?.mode === "default-banner";

  const shop = normalizeShopAnalytics(options.shop);
  let destroyed = false;
  let waitingForDefaultBannerInteraction = false;

  function getConfig() {
    return {
      shop,
      consent,
      customData,
    } satisfies StorefrontAnalyticsConfig;
  }

  // All event consumers use destinations for consent gating and event replay.
  const destinationManager = createDestinationManager({
    canTrack: () => !waitingForDefaultBannerInteraction && hasAnalyticsConsent(),
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

    // Buffer the event and deliver to destinations when analytics consent allows.
    destinationManager.onPublish(event, normalizedPayload);
  }

  const MOCK_SHOP_ID_SUFFIX = "/68817551382";

  let cleanupConsentReplay: (() => void) | undefined;

  function initConsentReplay() {
    if (typeof document === "undefined") return;

    const replayInitialConsent = () => {
      if (destroyed) return;

      // If privacy-banner is present and visible, initial readiness only
      // hydrates consent state; replay waits for the later interaction event.
      const shouldWaitForBannerInteraction =
        shouldWaitForDefaultBannerInteraction(usesDefaultBanner);

      waitingForDefaultBannerInteraction = shouldWaitForBannerInteraction;

      if (shouldWaitForBannerInteraction) return;

      destinationManager.replay();
    };

    const replayConsentEvent = () => {
      if (destroyed) return;

      waitingForDefaultBannerInteraction = false;

      /**
       * Interaction events replay when allowed. When denied, clear the buffer
       * and stop recording until a later interaction grants consent.
       */
      destinationManager.replay(true);
    };

    document.addEventListener(CONSENT_TRACKING_API_LOADED_EVENT, replayInitialConsent);
    document.addEventListener(VISITOR_CONSENT_COLLECTED_EVENT, replayConsentEvent);

    // Catch up if consent became ready before this listener attached.
    if (window.Shopify?.customerPrivacy?.consentStatus === "loaded") replayInitialConsent();

    cleanupConsentReplay = () => {
      document.removeEventListener(CONSENT_TRACKING_API_LOADED_EVENT, replayInitialConsent);
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
    destinationManager.destroy(); // Tear down destination subscriptions and cleanup hooks.
    cleanupConsentReplay?.();

    if (typeof window !== "undefined" && window.Shopify?.analytics === busInstance) {
      delete window.Shopify.analytics;
    }
  }

  const busInstance: StorefrontAnalytics = {
    publish,
    addDestination: destinationManager.addDestination, // Public API for consent-gated trackers.
    getConfig,
  };

  if (shop?.shopId && String(shop.shopId).endsWith(MOCK_SHOP_ID_SUFFIX)) {
    consoleLogger.warn("mock shop detected; analytics will not work properly", {
      scope: "analytics",
    });
  }

  initConsentReplay();
  initBrowserDiscovery();

  return { bus: busInstance, destroy };
}
