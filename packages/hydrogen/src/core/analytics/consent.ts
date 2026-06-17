import { loadScript } from "../utils/load-script";
import { ensureTrackingValues } from "./ensure-tracking-values";
import type { ConsentConfig } from "./types";
import { getTrackingValues } from "./utils/tracking-values";

export const CONSENT_API =
  "https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.2/consent-tracking-api.js";
export const CONSENT_API_WITH_BANNER =
  "https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js";

type ConsentDeps = {
  consent: ConsentConfig;
  onReady: () => void;
  onConsentCollected: (payload: { shouldRevalidate: boolean }) => void;
};
type ConfigurableCustomerPrivacy = Partial<CustomerPrivacyApi> & {
  config?: Partial<CustomerPrivacyConfig>;
};
type ConfigurableShopify = Omit<Shopify, "customerPrivacy"> & {
  customerPrivacy?: ConfigurableCustomerPrivacy;
};
type ShopifyWindow = { Shopify?: ConfigurableShopify };

function setCustomerPrivacyConfig(config: Partial<CustomerPrivacyConfig>) {
  const shopifyWindow = window as unknown as ShopifyWindow;
  const shopify = (shopifyWindow.Shopify ??= {});
  const customerPrivacy =
    typeof shopify.customerPrivacy === "object" && shopify.customerPrivacy !== null
      ? shopify.customerPrivacy
      : {};

  const nextCustomerPrivacy: ConfigurableCustomerPrivacy = {
    ...customerPrivacy,
    config: {
      ...customerPrivacy.config,
      ...config,
    },
  };
  shopify.customerPrivacy = nextCustomerPrivacy;
}

function shouldWaitForBannerInteraction() {
  const shouldShowGDPRBanner = window.Shopify?.customerPrivacy?.shouldShowGDPRBanner;
  if (typeof shouldShowGDPRBanner !== "function") return true;

  try {
    return shouldShowGDPRBanner() === true;
  } catch {
    return true;
  }
}

/**
 * Initializes consent management on the bus. Returns a cleanup function
 * that removes per-instance event listeners.
 */
export function initConsent(deps: ConsentDeps): () => void {
  if (typeof window === "undefined") return () => {};

  const { consent } = deps;
  const { consentDomain, publicStorefrontAccessToken, mode = "no-banner", language } = consent;
  const usesDefaultBanner = mode === "default-banner";
  const waitsForBannerInteraction = mode === "default-banner" || mode === "custom-banner";

  // --- Config validation ---
  if (
    publicStorefrontAccessToken &&
    (publicStorefrontAccessToken.startsWith("shpat_") || publicStorefrontAccessToken.length !== 32)
  ) {
    console.error(
      "[hydrogen:error:Analytics] It looks like you passed a private access token. Use a public Storefront API token.",
    );
  }

  // Normalize to remove protocol etc.
  const sfapiHost = consentDomain
    ? new URL(consentDomain.includes("://") ? consentDomain : `https://${consentDomain}`).host
    : undefined;

  const customerPrivacyConfig = {
    isHeadless: true,
    consentDomain: sfapiHost || window.location.host,
    ...(publicStorefrontAccessToken ? { storefrontAccessToken: publicStorefrontAccessToken } : {}),
  } satisfies CustomerPrivacyConfig;

  setCustomerPrivacyConfig(customerPrivacyConfig);

  if (language) {
    const shopifyWindow = window as unknown as ShopifyWindow;
    (shopifyWindow.Shopify ??= {}).locale = language;
  }

  if (consent.country) {
    const shopifyWindow = window as unknown as ShopifyWindow;
    (shopifyWindow.Shopify ??= {}).country = consent.country;
  }

  const cookiesReady = ensureTrackingValues(sfapiHost, publicStorefrontAccessToken);

  let consentScriptReady = false;
  let consentGateReady = false;
  let internalAnalyticsReady = false;
  let lastTrackingValues = getTrackingValues();

  const checkReady = () => {
    if (internalAnalyticsReady) return;
    if (consentScriptReady && consentGateReady) {
      internalAnalyticsReady = true;
      deps.onReady();
    }
  };

  const markConsentReady = () => {
    consentGateReady = true;
    checkReady();
  };

  const consentEventHandler = ((_event: CustomEvent) => {
    const latestTrackingValues = getTrackingValues();
    const shouldRevalidate =
      lastTrackingValues.visitToken !== latestTrackingValues.visitToken ||
      lastTrackingValues.uniqueToken !== latestTrackingValues.uniqueToken;

    lastTrackingValues = latestTrackingValues;

    deps.onConsentCollected({ shouldRevalidate });

    markConsentReady();
  }) as EventListener;

  document.addEventListener("visitorConsentCollected", consentEventHandler);

  // Fallback when consent readiness is blocked by a slow or blocked script.
  // Banner modes get longer because they may wait for banner interaction too.
  const consentTimeoutMs = waitsForBannerInteraction ? 10000 : 3000;
  const consentTimeoutId = setTimeout(() => {
    if (!consentGateReady) {
      consentGateReady = true;
      checkReady();
    }
  }, consentTimeoutMs);

  cookiesReady
    .catch(() => {})
    .then(() => {
      lastTrackingValues = getTrackingValues();
      if (lastTrackingValues.consent) {
        setCustomerPrivacyConfig({ injectedConsent: lastTrackingValues.consent });
      }

      return loadScript(usesDefaultBanner ? CONSENT_API_WITH_BANNER : CONSENT_API, {
        attributes: { id: "customer-privacy-api" },
      });
    })
    .then(() => {
      consentScriptReady = true;
      if (!waitsForBannerInteraction) {
        markConsentReady();
      } else if (!shouldWaitForBannerInteraction()) {
        markConsentReady();
      } else {
        checkReady();
      }
    })
    .catch(() => {
      // Consent script failed to load (ad blocker, CDN down, test environment).
      // The consent timeout (below) will still fire and unblock the privacy gate.
      // We silently swallow the error to avoid noise
    });

  return function cleanup() {
    document.removeEventListener("visitorConsentCollected", consentEventHandler);
    clearTimeout(consentTimeoutId);
  };
}
