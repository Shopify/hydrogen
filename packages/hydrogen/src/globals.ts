import type { ShopifyStandardActions } from "../vendor/standard-actions";
import type { StorefrontAnalytics } from "./core/analytics/types";
import type { I18nConfig } from "./core/headers";
import type { ShopifyStandardRouteMatch } from "./core/standard-routes/index";

export type ShopifyGlobal = {
  actions: ShopifyStandardActions;
  analytics?: StorefrontAnalytics;
  components: {
    config: {
      storeDomain: string;
      publicAccessToken?: string;
      apiVersion?: string;
      country?: string;
      language?: string;
    };
  };
  country: I18nConfig["country"] | string;
  currency?: {
    active: string;
  };
  customerPrivacy: {
    config?: {
      isHeadless?: boolean;
      consentDomain?: string;
    };
    consentStatus?: "pending" | "loaded";
    currentVisitorConsent: () => Record<string, unknown>;
    preferencesProcessingAllowed: () => boolean;
    saleOfDataAllowed: () => boolean;
    marketingAllowed: () => boolean;
    analyticsProcessingAllowed: () => boolean;
    setTrackingConsent: (
      consent: Record<string, unknown>,
      callback: (data: { error: string } | undefined) => void,
    ) => void | Promise<unknown>;
    shouldShowBanner: () => boolean;
  };
  locale: Lowercase<I18nConfig["language"]> | string;
  navigate?: (url: string) => void | Promise<void>;
  routes: {
    root: string;
    match?: (url: string) => ShopifyStandardRouteMatch | null;
    resolve?: (url: string) => string;
    [key: string]: unknown;
  };
  /** The shop's permanent `*.myshopify.com` domain. */
  shop: string;
  [key: string]: unknown;
};

type ShopifyPrivacyBanner = {
  showPreferences: () => Promise<void>;
  showBanner: () => Promise<void>;
};

declare global {
  interface Window {
    privacyBanner?: ShopifyPrivacyBanner;
    Shopify?: ShopifyGlobal;
  }
}
