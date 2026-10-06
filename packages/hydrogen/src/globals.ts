import type { ShopifyStandardActions } from "../vendor/standard-actions";
import type { StorefrontAnalytics } from "./core/analytics/types";
import type { I18nConfig } from "./core/request-context";
import type { ShopifyStandardRouteMatch } from "./core/standard-routes/index";

/** Shape of the `window.Shopify` global that Shopify's scripts and Hydrogen share in the browser. */
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
      asyncConsent?: boolean;
      asyncVisitorState?: boolean;
      consentDomain?: string;
    };
    consentStatus?: "loading" | "loaded";
    currentVisitorConsent: () => Record<string, unknown>;
    preferencesProcessingAllowed: () => boolean;
    saleOfDataAllowed: () => boolean;
    marketingAllowed: () => boolean;
    analyticsProcessingAllowed: () => boolean;
    /** Synchronizes consent with Shopify. Await completion before using the updated consent. */
    setTrackingConsent: (consent: Record<string, unknown>) => Promise<unknown>;
    shouldShowBanner: () => boolean;
    shouldShowGDPRBanner: () => boolean;
  };
  locale: Lowercase<I18nConfig["language"]> | string;
  /** @deprecated Use `Shopify.routes.navigate` instead. */
  navigate?: (url: string) => void | Promise<void>;
  routes: {
    root: string;
    /** @private */
    apiProxyPrefix?: string;
    /** @private */
    match?: (url: string) => ShopifyStandardRouteMatch | null;
    /** @private */
    resolve?: (url: string) => string;
    navigate?: (url: string) => void | Promise<void>;
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
