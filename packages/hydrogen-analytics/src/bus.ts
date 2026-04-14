/**
 * @module analytics/bus
 *
 * Framework-agnostic analytics event bus for Shopify storefronts.
 *
 * ## Migration from Analytics.Provider
 *
 * This bus replaces the React-coupled `<Analytics.Provider>` from
 * `@shopify/hydrogen`. The event names and payload shapes are intentionally
 * identical to ensure backward compatibility for custom subscribers.
 *
 * Key differences:
 * - No React dependency — works with any framework
 * - Explicit bus instance (`createAnalyticsBus`) instead of React context
 * - `subscribe()` returns an unsubscribe function (no useEffect dependency)
 * - Cart tracking is built into the bus via `updateCart()`
 *
 * Framework adapters (e.g. `templates/commerce/components/analytics/
 * analytics-provider.tsx` for React) bridge framework lifecycle to the bus.
 */
import type {AnalyticsBus, AnalyticsBusOptions, ShopAnalytics} from './types';
import {AnalyticsEvent} from './events';
import {createCartTracker} from './cart-tracker';
import {initShopifyAnalytics} from './shopify-analytics';
import {initPerfKit} from './perfkit';
import {initConsent} from './consent';
// @deprecated — see deprecated-cookies.ts for removal instructions
import {initDeprecatedCookies} from './deprecated-cookies';

function shopifyCanTrack(): boolean {
  try {
    return (
      window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() ?? false
    );
  } catch {
    return false;
  }
}

/**
 * Creates a framework-agnostic analytics event bus.
 *
 * Each call creates an isolated pub/sub instance. Consent interceptors
 * (window.Shopify / window.privacyBanner property descriptors) are
 * module-level singletons shared across instances — see consent.ts.
 */
export function createAnalyticsBus(options: AnalyticsBusOptions): AnalyticsBus {
  const {
    consent,
    canTrack: customCanTrack,
    customData,
    cookieDomain,
    autoInit = true,
  } = options;

  let shop: ShopAnalytics | null = options.shop;
  let currentCustomData = customData;
  let destroyed = false;

  const subscribers = new Map<string, Map<string, (payload: any) => void>>();
  const registers: Record<string, boolean> = {};
  const waitForReadyQueue: Array<{event: string; payload: any}> = [];
  let nextSubscriberId = 0;

  function areRegistersReady() {
    return Object.values(registers).every(Boolean);
  }

  const canTrack = customCanTrack ?? shopifyCanTrack;

  function publish(event: string, payload: any): void {
    if (destroyed) return;
    // Drop events when tracking is not allowed — matches the old Hydrogen
    // Analytics.Provider behavior where publish was a no-op when canTrack()
    // returned false. Events are permanently lost, not retroactively delivered.
    // The Monorail-level hasUserConsent check provides a second safety net.
    if (!canTrack()) return;
    if (!areRegistersReady()) {
      waitForReadyQueue.push({event, payload});
      return;
    }
    publishEvent(event, payload);
  }

  function publishEvent(event: string, payload: any): void {
    const eventSubscribers = subscribers.get(event) ?? new Map();
    eventSubscribers.forEach((callback, subscriberId) => {
      try {
        callback(payload);
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            'Analytics publish error',
            error.message,
            subscriberId,
            error.stack,
          );
        } else {
          console.error('Analytics publish error', error, subscriberId);
        }
      }
    });
  }

  function publishInternal(event: string, payload: any): void {
    if (destroyed) return;
    publishEvent(event, payload);
  }

  function subscribe(
    event: string,
    callback: (payload: any) => void,
  ): () => void {
    if (!subscribers.has(event)) {
      subscribers.set(event, new Map());
    }
    const id = String(nextSubscriberId++);
    subscribers.get(event)!.set(id, callback);
    return () => {
      subscribers.get(event)?.delete(id);
    };
  }

  function register(key: string) {
    if (!registers.hasOwnProperty(key)) {
      registers[key] = false;
    }
    return {
      ready: () => {
        registers[key] = true;
        if (areRegistersReady() && waitForReadyQueue.length > 0) {
          const queued = waitForReadyQueue.splice(0);
          for (const {event: queueEvent, payload: queuePayload} of queued) {
            publishEvent(queueEvent, queuePayload);
          }
        }
      },
    };
  }

  const cartTracker = createCartTracker({
    publish,
    getShop: () => shop,
    getCustomData: () => currentCustomData,
  });

  // Track whether internal subscribers have been initialized.
  // Supports lazy init: if shop is null at creation but provided later via
  // updateShop(), initialization runs at that point instead.
  let internalSubscribersInitialized = false;
  const cleanupFunctions: Array<() => void> = [];

  const MOCK_SHOP_ID_SUFFIX = '/68817551382';

  function initInternalSubscribers() {
    if (internalSubscribersInitialized || destroyed) return;
    if (!autoInit || typeof window === 'undefined' || !shop) return;

    internalSubscribersInitialized = true;

    if (shop.shopId.endsWith(MOCK_SHOP_ID_SUFFIX)) {
      console.warn(
        '[h2:warn:Analytics] Mock shop detected. Analytics will not work properly.',
      );
    }

    cleanupFunctions.push(initShopifyAnalytics({subscribe, register, publish}));
    cleanupFunctions.push(
      initConsent({
        consent,
        cookieDomain,
        subscribe,
        register,
        publishInternal,
        canTrack,
      }),
    );

    // @deprecated — legacy cookie management for backward compatibility
    cleanupFunctions.push(
      initDeprecatedCookies({
        subscribe,
        canTrack,
        checkoutDomain: consent?.checkoutDomain ?? '',
        cookieDomain,
      }),
    );

    let perfKitInitialized = false;
    const unsubConsentCollected = subscribe(
      AnalyticsEvent.CONSENT_COLLECTED,
      () => {
        if (shop && !perfKitInitialized) {
          perfKitInitialized = true;
          cleanupFunctions.push(initPerfKit({shop, subscribe, register}));
        }
      },
    );
    cleanupFunctions.push(unsubConsentCollected);
  }

  // Attempt init immediately (works when shop is provided at creation)
  initInternalSubscribers();

  function destroy() {
    destroyed = true;
    subscribers.clear();
    waitForReadyQueue.length = 0;
    cleanupFunctions.forEach((fn) => fn());
    cleanupFunctions.length = 0;
  }

  return {
    publish,
    subscribe,
    register,
    updateCart: cartTracker.updateCart,
    destroy,
    _internal: {
      updateShop: (newShop: ShopAnalytics | null) => {
        shop = newShop;
        // Lazy init: if shop was null at creation but is now provided,
        // trigger internal subscriber initialization
        initInternalSubscribers();
      },
      updateCustomData: (newData: Record<string, unknown> | undefined) => {
        currentCustomData = newData;
      },
      getShop: () => shop,
      getCustomData: () => currentCustomData,
      getPrevCart: cartTracker.getPrevCart,
      canTrack,
    },
  };
}