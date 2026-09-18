import type { ConsentPreferences, ConsentSetup, StorefrontAnalytics } from "./types";

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

export function setTrackingConsent(consent: ConsentPreferences): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const privacy = window.Shopify?.customerPrivacy;
    if (privacy?.consentStatus !== "loaded") throw new Error("Shopify consent is not loaded.");
    const result = privacy.setTrackingConsent(consent, (error) => {
      if (error) reject(new Error(error.error));
      else resolve();
    });
    // CTA supports callbacks and promises; callback-only versions return undefined.
    if (result) void result.then(() => resolve(), reject);
  });
}
