import type { ConsentSetup, StorefrontAnalytics } from "./types";

// The inline bus and hydrated app are separate bundles. This private hook passes
// the app's setup callback to the bus without serializing it into HTML.
export const CUSTOM_CONSENT = Symbol.for("shopify.hydrogen.custom-consent");

type AnalyticsWithCustomConsent = StorefrontAnalytics & {
  [CUSTOM_CONSENT]?: (setup: ConsentSetup) => void;
};

export function initializeCustomConsent(setup: ConsentSetup): void {
  if (typeof window === "undefined") return;

  const analytics: AnalyticsWithCustomConsent | undefined = window.Shopify?.analytics;
  const initialize = analytics?.[CUSTOM_CONSENT];
  if (!initialize) {
    throw new Error(
      'Custom consent requires Shopify script tags rendered with consent.mode = "custom-banner".',
    );
  }
  initialize(setup);
}
