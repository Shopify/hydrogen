import type { ShopifyStandardActions } from "../vendor/standard-actions";
import type { StorefrontAnalytics } from "./core/analytics/types";
import type { I18nConfig } from "./core/request-context";
import type { ShopifyStandardRouteMatch } from "./core/standard-routes/index";

/**
 * The `window.Shopify` object that Shopify's scripts and Hydrogen share in the browser.
 *
 * @publicDocs
 */
export type ShopifyGlobal = {
  actions: ShopifyStandardActions;
  analytics?: StorefrontAnalytics;
  /** The store settings that Shopify's storefront web components read. */
  components: {
    config: {
      storeDomain: string;
      publicAccessToken?: string;
      apiVersion?: string;
      country?: string;
      language?: string;
    };
  };
  /** The customer's country code. Defaults to `US`. */
  country: I18nConfig["country"] | string;
  /** The active currency code, in uppercase. */
  currency?: {
    active: string;
  };
  /** Shopify's Customer Privacy API, which reads and updates the customer's consent. */
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
  /** The customer's language code, in lowercase. Defaults to `en`. */
  locale: Lowercase<I18nConfig["language"]> | string;
  /**
   * Navigates to a storefront URL.
   * @deprecated Use `Shopify.routes.navigate` instead.
   */
  navigate?: (url: string) => void | Promise<void>;
  /** The storefront's route settings and navigation helper. */
  routes: {
    /** The locale path prefix with a trailing slash, or `"/"` when the storefront has no prefix. */
    root: string;
    /** @private */
    apiProxyPrefix?: string;
    /** @private */
    match?: (url: string) => ShopifyStandardRouteMatch | null;
    /** @private */
    resolve?: (url: string) => string;
    /** Navigates to a storefront URL after resolving it to your app's route. */
    navigate?: (url: string) => void | Promise<void>;
    [key: string]: unknown;
  };
  /** The shop's permanent `*.myshopify.com` domain. */
  shop: string;
  [key: string]: unknown;
};

/** Headless storefronts must supply the public Storefront API token and both root domains. */
type ShopifyPrivacyBannerOptions = {
  storefrontAccessToken?: string;
  checkoutRootDomain?: string;
  storefrontRootDomain?: string;
  locale?: string;
  country?: string;
};

type ShopifyPrivacyBanner = {
  showPreferences: (options?: ShopifyPrivacyBannerOptions) => Promise<void>;
  showBanner: (options?: ShopifyPrivacyBannerOptions) => Promise<void>;
};

declare global {
  interface Window {
    privacyBanner?: ShopifyPrivacyBanner;
    Shopify?: ShopifyGlobal;
  }
}
