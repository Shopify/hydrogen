import {
  createStorefrontAnalytics,
  AnalyticsEvent,
  type ConsentConfig,
  type ShopAnalytics,
  type StorefrontAnalytics,
} from "@shopify/hydrogen";

export { AnalyticsEvent };

/**
 * Analytics singleton (`hydrogen-analytics` skill). One bus per page lifetime,
 * lazily created on the client. SSR no-ops via the `typeof window` guard.
 *
 * `shop` and `consent` are resolved on the server root from `@shared/config`
 * and passed into `configureAnalytics()` before any route publishes a view
 * event (F9: no polling, no init race). The whole `analyticsConsent` object
 * (incl. `publicStorefrontAccessToken`) is threaded so the banner/consent mode
 * matches `examples/shared/config.ts`.
 */
let bus: StorefrontAnalytics | null = null;
let analyticsShop: ShopAnalytics | null = null;
let analyticsConsent: ConsentConfig | null = null;

export function configureAnalytics(shop: ShopAnalytics, consent: ConsentConfig) {
  if (typeof window === "undefined") return;
  analyticsShop = shop;
  analyticsConsent = consent;
}

export function getAnalyticsShop(): ShopAnalytics | null {
  return analyticsShop;
}

export function getAnalytics(): StorefrontAnalytics | null {
  if (typeof window === "undefined") return null; // SSR no-op
  if (!analyticsShop || !analyticsConsent) return null;
  if (bus) return bus;
  bus = createStorefrontAnalytics({
    shop: analyticsShop,
    consent: analyticsConsent,
    // canTrack: leave the default (Customer Privacy API) in production.
  });
  return bus;
}
