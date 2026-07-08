import type { ShopifyStandardActions } from "../vendor/standard-actions";
import type { StorefrontAnalytics } from "./core/analytics/types";
import type { I18nConfig } from "./core/headers";
import type { ShopifyStandardRouteMatch } from "./core/standard-routes/index";

export type ShopifyGlobal = {
  actions: ShopifyStandardActions;
  analytics?: StorefrontAnalytics;
  country: I18nConfig["country"] | string;
  customerPrivacy: {
    config?: {
      isHeadless?: boolean;
      consentDomain?: string;
      storefrontAccessToken?: string;
      injectedConsent?: string;
    };
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
  locale: Lowercase<I18nConfig["language"]> | string;
  navigate?: (url: string) => void | Promise<void>;
  routes: {
    root: string;
    match?: (url: string) => ShopifyStandardRouteMatch | null;
    resolve?: (url: string) => string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

declare global {
  interface Window {
    Shopify?: ShopifyGlobal;
  }
}
