import {loadScript} from './utils/load-script';
import {getTrackingValues} from './utils/tracking-values';
import {AnalyticsEvent} from './events';
import type {ConsentConfig} from './types';
import {
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from '../constants';

const CONSENT_API =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js';
const CONSENT_API_WITH_BANNER =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js';

type ConsentDeps = {
  consent: ConsentConfig;
  cookieDomain?: string;
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
  register: (key: string) => {ready: () => void};
  publishInternal: (event: string, payload: any) => void;
  canTrack: () => boolean;
};

function isSfapiProxyEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const entry = window.performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    return !!entry?.serverTiming?.some(
      (e) => e.name === HYDROGEN_SFAPI_PROXY_KEY,
    );
  } catch {
    return false;
  }
}

function hasServerReturnedTrackingValues(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const entry = window.performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    return !!entry?.serverTiming?.some(
      (e) => e.name === HYDROGEN_SERVER_TRACKING_KEY,
    );
  } catch {
    return false;
  }
}

function parseStoreDomain(checkoutDomain: string): string | undefined {
  if (typeof window === 'undefined') return;
  const host = window.location.host;
  const checkoutParts = checkoutDomain.split('.').reverse();
  const currentParts = host.split('.').reverse();
  const sameParts: string[] = [];
  checkoutParts.forEach((part, index) => {
    if (part === currentParts[index]) sameParts.push(part);
  });
  return sameParts.reverse().join('.') || undefined;
}

export function initConsent(deps: ConsentDeps) {
  const {consent, publishInternal} = deps;
  const {ready: analyticsReady} = deps.register('Internal_Shopify_Analytics');

  const {
    checkoutDomain = '',
    storefrontAccessToken = '',
    withPrivacyBanner = false,
    language,
    sameDomainForStorefrontApi,
  } = consent;

  const initialTrackingValues = getTrackingValues();

  const hasSfapiProxy = sameDomainForStorefrontApi ?? isSfapiProxyEnabled();
  const commonAncestorDomain = parseStoreDomain(checkoutDomain);
  const sfapiDomain =
    hasSfapiProxy && typeof window !== 'undefined'
      ? window.location.host
      : checkoutDomain;

  const config = {
    checkoutRootDomain: sfapiDomain,
    storefrontRootDomain: commonAncestorDomain
      ? '.' + commonAncestorDomain
      : undefined,
    storefrontAccessToken:
      storefrontAccessToken || 'abcdefghijklmnopqrstuvwxyz123456',
    country: consent.country,
    locale: language,
  };

  let shopifySubscriptionsReady = false;
  let privacyReady = false;
  let hasCalledReady = false;
  let bannerApiLoaded = false;

  function checkReady() {
    if (hasCalledReady) return;
    if (shopifySubscriptionsReady && privacyReady) {
      hasCalledReady = true;
      analyticsReady();
    }
  }

  /**
   * Auto-loads the privacy banner once both customerPrivacy and privacyBanner
   * APIs are ready. Mirrors the old Hydrogen behavior in ShopifyCustomerPrivacy.tsx
   * where `privacyBanner.loadBanner(config)` is called after APIs load.
   *
   * Also injects cachedConsent from server-timing so the consent-tracking-api
   * has correct initial state rather than assuming no consent.
   */
  function maybeLoadBanner() {
    if (!withPrivacyBanner || !bannerApiLoaded || !shopifySubscriptionsReady)
      return;

    const customerPrivacy = (window as any).Shopify?.customerPrivacy;
    if (customerPrivacy && !customerPrivacy.cachedConsent) {
      const trackingValues = getTrackingValues();
      if (trackingValues.consent) {
        customerPrivacy.cachedConsent = trackingValues.consent;
      }
    }

    (window as any).privacyBanner?.loadBanner(config);
  }

  const scriptUrl = withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API;
  loadScript(scriptUrl, {attributes: {id: 'customer-privacy-api'}}).catch(
    () => {
      // Consent script failed to load (ad blocker, CDN down, test environment).
      // The consent timeout (below) will still fire and unblock the bus.
    },
  );

  document.addEventListener('visitorConsentCollected', ((
    event: CustomEvent,
  ) => {
    const latestTrackingValues = getTrackingValues();
    const trackingValuesChanged =
      initialTrackingValues.visitToken !== latestTrackingValues.visitToken ||
      initialTrackingValues.uniqueToken !== latestTrackingValues.uniqueToken;

    publishInternal(AnalyticsEvent.CONSENT_COLLECTED, {trackingValuesChanged});

    privacyReady = true;
    checkReady();
  }) as EventListener);

  if (!withPrivacyBanner) {
    const CONSENT_TIMEOUT_IN_MS = 3000;
    setTimeout(() => {
      if (!privacyReady) {
        privacyReady = true;
        checkReady();
      }
    }, CONSENT_TIMEOUT_IN_MS);
  }

  // Watch for window.Shopify.customerPrivacy to be set by the consent script
  let customShopify: any = window.Shopify || undefined;
  let customCustomerPrivacy: any = null;

  Object.defineProperty(window, 'Shopify', {
    configurable: true,
    get() {
      return customShopify;
    },
    set(value: unknown) {
      if (
        typeof value === 'object' &&
        value !== null &&
        Object.keys(value).length === 0
      ) {
        customShopify = value;
        Object.defineProperty(window.Shopify, 'customerPrivacy', {
          configurable: true,
          get() {
            return customCustomerPrivacy;
          },
          set(cpValue: unknown) {
            if (
              typeof cpValue === 'object' &&
              cpValue !== null &&
              'setTrackingConsent' in cpValue
            ) {
              const cp = cpValue as any;
              const originalSetTracking = cp.setTrackingConsent;
              customCustomerPrivacy = {
                ...cp,
                setTrackingConsent: (consentValues: any, callback: any) => {
                  originalSetTracking(
                    {...config, headlessStorefront: true, ...consentValues},
                    callback,
                  );
                },
              };
              customShopify = {
                ...customShopify,
                customerPrivacy: customCustomerPrivacy,
              };
              shopifySubscriptionsReady = true;
              checkReady();
              maybeLoadBanner();
            }
          },
        });
      }
    },
  });

  if (withPrivacyBanner) {
    let customPrivacyBanner: any = window.privacyBanner || undefined;
    let bannerApiLoaded = false;

    Object.defineProperty(window, 'privacyBanner', {
      configurable: true,
      get() {
        return customPrivacyBanner;
      },
      set(value: unknown) {
        if (
          typeof value === 'object' &&
          value !== null &&
          'showPreferences' in value &&
          'loadBanner' in value
        ) {
          const pb = value as any;
          customPrivacyBanner = {
            loadBanner: (userConfig?: any) =>
              pb.loadBanner(userConfig ? {...config, ...userConfig} : config),
            showPreferences: (userConfig?: any) =>
              pb.showPreferences(
                userConfig ? {...config, ...userConfig} : config,
              ),
          };

          bannerApiLoaded = true;
          maybeLoadBanner();
        }
      },
    });
  }
}
