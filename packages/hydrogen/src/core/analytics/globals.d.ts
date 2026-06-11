/**
 * Global type declarations for browser APIs injected by Shopify's
 * consent-tracking-api and privacy-banner scripts.
 *
 * These scripts read window.Shopify.customerPrivacy.config and set
 * window.Shopify.customerPrivacy at runtime.
 */

declare global {
  type CustomerPrivacyConfig = {
    isHeadless?: boolean;
    consentDomain?: string;
    storefrontAccessToken?: string;
    injectedConsent?: string;
  };

  type CustomerPrivacyApi = {
    config?: CustomerPrivacyConfig;
    currentVisitorConsent: () => Record<string, unknown>;
    preferencesProcessingAllowed: () => boolean;
    saleOfDataAllowed: () => boolean;
    marketingAllowed: () => boolean;
    analyticsProcessingAllowed: () => boolean;
    setTrackingConsent: (
      consent: Record<string, unknown>,
      callback: (data: { error: string } | undefined) => void,
    ) => void;
    shouldShowBanner: () => boolean;
    shouldShowGDPRBanner: () => boolean;
  };

  // Augments the global `Shopify` interface declared in
  // vendor/standard-actions.d.ts. That file types `Window.Shopify` as
  // `Shopify & { [key: string]: unknown }` — without this augmentation,
  // accessing `window.Shopify.customerPrivacy` falls through to the index
  // signature and resolves to `{}`.
  interface Shopify {
    customerPrivacy?: CustomerPrivacyApi;
    headless?: {
      analytics?: import("./types").StorefrontAnalytics;
    };
  }

  interface Window {
    Shopify?: Shopify & {
      [key: string]: unknown;
    };
    PerfKit?: {
      navigate: () => void;
      setPageType: (pageType: string) => void;
    };
  }
}

export {};
