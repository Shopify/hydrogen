import type { ShopifyGlobal } from "../../globals";
import type { AnalyticsTrackingValues } from "./types";

type TrackingTokenOptions = {
  generateFallback?: boolean;
  tag?: string;
};

// Keep the consent API's token interface out of Hydrogen's
// public global types since it could change in the future.
type CustomerPrivacyWithTracking = ShopifyGlobal["customerPrivacy"] & {
  __internal?: {
    uniqueToken?: (options?: TrackingTokenOptions) => string | undefined;
    visitToken?: (options?: TrackingTokenOptions) => string | undefined;
  };
};

export function getTrackingValues(tag: string): AnalyticsTrackingValues {
  const privacy: CustomerPrivacyWithTracking | undefined =
    typeof window === "undefined" ? undefined : window.Shopify?.customerPrivacy;
  const internal = privacy?.__internal;
  const options = { generateFallback: true, tag };

  return {
    uniqueToken: internal?.uniqueToken?.(options) ?? "",
    visitToken: internal?.visitToken?.(options) ?? "",
  };
}
