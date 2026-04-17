import {loadScript} from './utils/load-script';
import {getTrackingValues} from './utils/tracking-values';
import {AnalyticsEvent} from './events';
import type {ConsentConfig} from './types';
import {
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from './constants';
import {ensureTrackingValues} from './ensure-tracking-values';

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

// --- Module-level interceptor state ---
// Object.defineProperty on window.Shopify / window.privacyBanner is inherently
// global — only one descriptor can exist per property. We install once and
// fan out to all registered bus instances via callback arrays.

type ConsentReadyCallback = () => void;

const shopifyReadyCallbacks: ConsentReadyCallback[] = [];
let shopifyInterceptorInstalled = false;
let shopifyConsentResolved = false;

const bannerReadyCallbacks: ConsentReadyCallback[] = [];
let bannerInterceptorInstalled = false;
let bannerResolved = false;

let hasEmittedPrivacyApiLoaded = false;

// Set-based dedup for one-time warning/error messages
const loggedMessages = new Set<string>();

/**
 * Resets module-level interceptor state between tests. The interceptors
 * are global singletons that persist across initConsent calls, so tests
 * need a way to start fresh.
 * @internal test-only
 */
export function _resetConsentInterceptorsForTesting() {
  shopifyReadyCallbacks.length = 0;
  shopifyInterceptorInstalled = false;
  shopifyConsentResolved = false;
  bannerReadyCallbacks.length = 0;
  bannerInterceptorInstalled = false;
  bannerResolved = false;
  hasEmittedPrivacyApiLoaded = false;
  loggedMessages.clear();

  // Restore window.Shopify and window.privacyBanner to plain data properties
  // so Object.defineProperty can re-install interceptors cleanly.
  try {
    delete (window as any).Shopify;
  } catch {}
  try {
    delete (window as any).privacyBanner;
  } catch {}
}

function emitCustomerPrivacyApiLoaded() {
  if (hasEmittedPrivacyApiLoaded) return;
  hasEmittedPrivacyApiLoaded = true;
  document.dispatchEvent(new CustomEvent('shopifyCustomerPrivacyApiLoaded'));
}

function errorOnce(message: string) {
  if (loggedMessages.has(message)) return;
  loggedMessages.add(message);
  console.error(message);
}

function notifyShopifyReadyCallbacks() {
  shopifyConsentResolved = true;
  for (const cb of shopifyReadyCallbacks) {
    cb();
  }
}

function notifyBannerReadyCallbacks() {
  bannerResolved = true;
  for (const cb of bannerReadyCallbacks) {
    cb();
  }
}

/**
 * Installs the window.Shopify property interceptor exactly once.
 * Watches for the consent script to assign window.Shopify = {} and then
 * window.Shopify.customerPrivacy = { setTrackingConsent, ... }.
 * When detected, wraps setTrackingConsent with headless config and
 * notifies all registered callbacks.
 */
function installShopifyInterceptor(config: Record<string, unknown>) {
  if (shopifyInterceptorInstalled) return;
  shopifyInterceptorInstalled = true;

  let customShopify: any = (window as any).Shopify || undefined;
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
        Object.defineProperty((window as any).Shopify, 'customerPrivacy', {
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
              notifyShopifyReadyCallbacks();
            }
          },
        });
      }
    },
  });
}

/**
 * Installs the window.privacyBanner property interceptor exactly once.
 * Wraps loadBanner/showPreferences with headless config and notifies
 * all registered callbacks when the banner API loads.
 */
function installBannerInterceptor(config: Record<string, unknown>) {
  if (bannerInterceptorInstalled) return;
  bannerInterceptorInstalled = true;

  let customPrivacyBanner: any = (window as any).privacyBanner || undefined;

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

        notifyBannerReadyCallbacks();
      }
    },
  });
}

/**
 * Checks if a specific key is present in the Server-Timing header of the
 * navigation entry. Matches the old `hasServerTimingInNavigationEntry(key)`
 * in server-timing.ts.
 */
function hasServerTimingKey(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const entry = window.performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    return !!entry?.serverTiming?.some((e) => e.name === key);
  } catch {
    return false;
  }
}

function isSfapiProxyEnabled(): boolean {
  return hasServerTimingKey(HYDROGEN_SFAPI_PROXY_KEY);
}

function hasServerReturnedTrackingValues(): boolean {
  return hasServerTimingKey(HYDROGEN_SERVER_TRACKING_KEY);
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

/**
 * Initializes consent management on the bus. Returns a cleanup function
 * that removes per-instance callbacks from module-level arrays.
 */
export function initConsent(deps: ConsentDeps): () => void {
  const {consent, publishInternal} = deps;
  const {ready: analyticsReady} = deps.register('Internal_Shopify_Analytics');

  const {
    checkoutDomain = '',
    storefrontAccessToken = '',
    withPrivacyBanner = false,
    language,
    sameDomainForStorefrontApi,
  } = consent;

  // --- Config validation (matches old AnalyticsProvider behavior) ---
  if (!checkoutDomain) {
    errorOnce(
      '[h2:error:Analytics] consent.checkoutDomain is required. Make sure PUBLIC_CHECKOUT_DOMAIN is defined in your environment variables. See https://h2o.fyi/analytics/consent to learn how to setup environment variables in the Shopify admin.',
    );
  }
  if (!storefrontAccessToken) {
    errorOnce(
      '[h2:error:Analytics] consent.storefrontAccessToken is required. Make sure PUBLIC_STOREFRONT_API_TOKEN is defined in your environment variables. See https://h2o.fyi/analytics/consent to learn how to setup environment variables in the Shopify admin.',
    );
  }
  if (
    storefrontAccessToken &&
    (storefrontAccessToken.startsWith('shpat_') ||
      storefrontAccessToken.length !== 32)
  ) {
    errorOnce(
      '[h2:error:Analytics] It looks like you passed a private access token, make sure to use the public token',
    );
  }

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

    const customerPrivacy = window.Shopify?.customerPrivacy as
      | (CustomerPrivacyApi & {cachedConsent?: unknown})
      | undefined;
    if (customerPrivacy && !customerPrivacy.cachedConsent) {
      const trackingValues = getTrackingValues();
      if (trackingValues.consent) {
        customerPrivacy.cachedConsent = trackingValues.consent;
      }
    }

    window.privacyBanner?.loadBanner(config);
  }

  const scriptUrl = withPrivacyBanner ? CONSENT_API_WITH_BANNER : CONSENT_API;
  loadScript(scriptUrl, {attributes: {id: 'customer-privacy-api'}}).catch(
    () => {
      // Consent script failed to load (ad blocker, CDN down, test environment).
      // The consent timeout (below) will still fire and unblock the bus.
    },
  );

  const consentEventHandler = ((event: CustomEvent) => {
    // noInteraction guard: filter premature visitorConsentCollected events
    // when the Privacy Banner SDK fires before the user has actually interacted.
    // This mirrors the old ShopifyCustomerPrivacy.tsx behavior (lines 249-273).
    if (withPrivacyBanner) {
      try {
        const customerPrivacy = window.Shopify?.customerPrivacy;
        if (customerPrivacy?.shouldShowBanner?.()) {
          const consentValues = customerPrivacy.currentVisitorConsent?.();
          if (consentValues) {
            const noInteraction =
              consentValues.marketing === '' &&
              consentValues.analytics === '' &&
              consentValues.preferences === '';
            if (noInteraction) return;
          }
        }
      } catch {
        // Consent API may not be fully loaded yet — proceed normally
      }
    }

    const latestTrackingValues = getTrackingValues();
    const trackingValuesChanged =
      initialTrackingValues.visitToken !== latestTrackingValues.visitToken ||
      initialTrackingValues.uniqueToken !== latestTrackingValues.uniqueToken;

    publishInternal(AnalyticsEvent.CONSENT_COLLECTED, {trackingValuesChanged});

    privacyReady = true;
    checkReady();
  }) as EventListener;
  document.addEventListener('visitorConsentCollected', consentEventHandler);

  let consentTimeoutId: ReturnType<typeof setTimeout>;
  if (!withPrivacyBanner) {
    const CONSENT_TIMEOUT_IN_MS = 3000;
    consentTimeoutId = setTimeout(() => {
      if (!privacyReady) {
        privacyReady = true;
        checkReady();
      }
    }, CONSENT_TIMEOUT_IN_MS);
  } else {
    // Banner mode: longer timeout as fallback when the privacy banner script
    // is blocked by ad blockers. Without this, the bus would be permanently
    // blocked with no recovery path.
    const BANNER_TIMEOUT_IN_MS = 10000;
    consentTimeoutId = setTimeout(() => {
      if (!privacyReady) {
        privacyReady = true;
        checkReady();
      }
    }, BANNER_TIMEOUT_IN_MS);
  }

  // Register per-instance callback for when the Shopify consent script loads.
  // The interceptor is global (only one descriptor on window.Shopify), but
  // each bus instance needs its own notification to unblock its ready gate.
  // When SFAPI proxy is enabled but server didn't return tracking values
  // (cached response), fetch them from the browser to trigger http-only
  // cookie setting and populate Server-Timing resource entries.
  const needsBrowserFetch = hasSfapiProxy && !hasServerReturnedTrackingValues();

  const shopifyCallback: ConsentReadyCallback = () => {
    shopifySubscriptionsReady = true;
    emitCustomerPrivacyApiLoaded();

    if (needsBrowserFetch) {
      ensureTrackingValues(storefrontAccessToken, checkoutDomain).finally(
        () => {
          checkReady();
          maybeLoadBanner();
        },
      );
    } else {
      checkReady();
      maybeLoadBanner();
    }
  };
  shopifyReadyCallbacks.push(shopifyCallback);

  if (shopifyConsentResolved) {
    shopifyCallback();
  }

  installShopifyInterceptor(config);

  let bannerCallback: ConsentReadyCallback | null = null;
  if (withPrivacyBanner) {
    bannerCallback = () => {
      bannerApiLoaded = true;
      maybeLoadBanner();
    };
    bannerReadyCallbacks.push(bannerCallback);

    if (bannerResolved) {
      bannerCallback();
    }

    installBannerInterceptor(config);
  }

  return function cleanup() {
    document.removeEventListener(
      'visitorConsentCollected',
      consentEventHandler,
    );
    clearTimeout(consentTimeoutId);

    const shopifyIdx = shopifyReadyCallbacks.indexOf(shopifyCallback);
    if (shopifyIdx !== -1) shopifyReadyCallbacks.splice(shopifyIdx, 1);
    if (bannerCallback) {
      const bannerIdx = bannerReadyCallbacks.indexOf(bannerCallback);
      if (bannerIdx !== -1) bannerReadyCallbacks.splice(bannerIdx, 1);
    }
  };
}