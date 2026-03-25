import type {AnalyticsBus, AnalyticsBusOptions, ShopAnalytics} from './types';
import {AnalyticsEvent} from './events';
import {createCartTracker} from './cart-tracker';
import {initShopifyAnalytics} from './shopify-analytics';
import {initPerfKit} from './perfkit';
import {initConsent} from './consent';

function shopifyCanTrack(): boolean {
  try {
    return (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed();
  } catch {
    return false;
  }
}

/**
 * Creates a framework-agnostic analytics event bus.
 *
 * Each call creates an isolated instance — no shared global state.
 * The bus manages pub/sub, cart diffing, consent, Monorail dispatch, and PerfKit.
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
  const waitForReadyQueue = new Map<string, any>();
  let nextSubscriberId = 0;

  function areRegistersReady() {
    return Object.values(registers).every(Boolean);
  }

  const canTrack = customCanTrack ?? shopifyCanTrack;

  function publish(event: string, payload: any): void {
    if (destroyed) return;
    if (!canTrack()) return;
    if (!areRegistersReady()) {
      waitForReadyQueue.set(event, payload);
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
        if (areRegistersReady() && waitForReadyQueue.size > 0) {
          waitForReadyQueue.forEach((queuePayload, queueEvent) => {
            publishEvent(queueEvent, queuePayload);
          });
          waitForReadyQueue.clear();
        }
      },
    };
  }

  const cartTracker = createCartTracker({
    publish,
    getShop: () => shop,
    getCustomData: () => currentCustomData,
  });

  if (autoInit && typeof window !== 'undefined' && shop) {
    initShopifyAnalytics({subscribe, register, publish});
    initConsent({
      consent,
      cookieDomain,
      subscribe,
      register,
      publishInternal,
      canTrack,
    });

    subscribe(AnalyticsEvent.CONSENT_COLLECTED, () => {
      if (shop) initPerfKit({shop, subscribe, register});
    });
  }

  function destroy() {
    destroyed = true;
    subscribers.clear();
    waitForReadyQueue.clear();
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
