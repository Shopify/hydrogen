import { VISITOR_CONSENT_COLLECTED_EVENT } from "../shopify-scripts/constants";
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
  console.warn(`[h3:warn:Analytics] Unsupported analytics event "${String(event)}".`);
}

function hasNoConsentInteraction(currentVisitorConsent: unknown): boolean {
  // Mirrors the privacy-banner GDPR requirement: the initial event is only
  // pre-interaction while all purpose values are still unset.
  return (
    !isObjectRecord(currentVisitorConsent) ||
    (currentVisitorConsent.analytics === "" &&
      currentVisitorConsent.marketing === "" &&
      currentVisitorConsent.preferences === "")
  );
}

// Only Shopify's privacy-banner has a known pre-interaction initial event:
// it may call setTrackingConsent once to hydrate consent state, then again
// after the shopper accepts or declines. Custom banners also may call
// setTrackingConsent later, but Hydrogen does not own or observe their UI
// lifecycle, so their initial event must be treated as actionable consent.
function shouldWaitForDefaultBannerInteraction(): boolean {
  try {
    if (!isObjectRecord(window.privacyBanner)) return false;

    const privacy = window.Shopify?.customerPrivacy;
    const shouldShowBanner = privacy?.shouldShowBanner;
    if (typeof shouldShowBanner !== "function") return true;

    return shouldShowBanner() && hasNoConsentInteraction(privacy?.currentVisitorConsent?.());
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

  const shop = normalizeShopAnalytics(options.shop);
  let destroyed = false;
  let waitingForDefaultBannerInteraction = false;

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

    const replay = (event: Event) => {
      if (destroyed) return;

      const detail = (event as CustomEvent<{ source?: string }>).detail;
      const source = detail?.source;
      // The consent bootstrap temporarily annotates source until consent-tracking-api
      // owns it. If privacy-banner is present and visible, the initial event only
      // hydrates consent state; replay waits for the later interaction event.
      const shouldWaitForBannerInteraction =
        source === "initial" && shouldWaitForDefaultBannerInteraction();

      waitingForDefaultBannerInteraction = shouldWaitForBannerInteraction;

      if (shouldWaitForBannerInteraction) {
        return;
      }

      const clearWhenBlocked = source !== "initial";

      /**
       * Replay behavior depends on the consent event phase and the current
       * tracking permission:
       * - default-banner initial + banner required: keep waiting for the user's interaction.
       * - initial + allowed: replay buffered events.
       * - interaction + allowed: replay buffered events.
       * - interaction + denied: drop the buffer and stop recording until allowed.
       */
      destinationManager.replay(clearWhenBlocked);
    };

    document.addEventListener(VISITOR_CONSENT_COLLECTED_EVENT, replay);
    cleanupConsentReplay = () => {
      document.removeEventListener(VISITOR_CONSENT_COLLECTED_EVENT, replay);
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
    console.warn("[h2:warn:Analytics] Mock shop detected. Analytics will not work properly.");
  }

  initConsentReplay();
  initBrowserDiscovery();

  return busInstance;
}
