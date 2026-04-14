/**
 * Global type declarations for browser APIs injected by Shopify's
 * consent-tracking-api and privacy-banner scripts.
 *
 * These scripts set window.Shopify.customerPrivacy and window.privacyBanner
 * at runtime via Object.defineProperty watchers in consent.ts.
 */

type CustomerPrivacyApi = {
  currentVisitorConsent: () => Record<string, unknown>;
  preferencesProcessingAllowed: () => boolean;
  saleOfDataAllowed: () => boolean;
  marketingAllowed: () => boolean;
  analyticsProcessingAllowed: () => boolean;
  setTrackingConsent: (
    consent: Record<string, unknown>,
    callback: (data: {error: string} | undefined) => void,
  ) => void;
  shouldShowBanner: () => boolean;
};

type PrivacyBannerApi = {
  loadBanner: (options?: Record<string, unknown>) => void;
  showPreferences: (options?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Shopify?: {
      customerPrivacy?: CustomerPrivacyApi;
    };
    privacyBanner?: PrivacyBannerApi;
    PerfKit?: {
      navigate: () => void;
      setPageType: (pageType: string) => void;
    };
  }
}

export {};