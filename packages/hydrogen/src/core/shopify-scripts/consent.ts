import type { ConsentConfig } from "../analytics/types";
import initializeShopifyConsentTracking from "./consent-script" with { type: "script" };
import type { ShopifyConsentTrackingConfig } from "./consent-script";
import { SHOPIFY_CONSENT_SCRIPT_ID, VISITOR_CONSENT_COLLECTED_EVENT } from "./constants";
import { asInlineScript } from "./utils/inline-script";

export function getShopifyConsentTrackingScript(consent: ConsentConfig = {}): string {
  const config: ShopifyConsentTrackingConfig = {
    eventName: VISITOR_CONSENT_COLLECTED_EVENT,
    mode: consent.mode ?? "no-banner",
    scriptId: SHOPIFY_CONSENT_SCRIPT_ID,
  };

  return asInlineScript(initializeShopifyConsentTracking)(config);
}
