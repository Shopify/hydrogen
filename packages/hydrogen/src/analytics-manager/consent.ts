import type {CustomerPrivacy} from '../customer-privacy/ShopifyCustomerPrivacy';

/** Check current consent both when publishing and when sending to Shopify. */
export function hasAnalyticsConsent(): boolean {
  try {
    const privacy = window.Shopify?.customerPrivacy;
    if (privacy?.consentStatus !== 'loaded') return false;
    if (privacy.currentVisitorConsent?.().analytics === 'no') return false;

    return privacy.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

export function shouldWaitForPrivacyBanner(privacy: CustomerPrivacy): boolean {
  if (!privacy.shouldShowBanner()) return false;

  // Match PB's interaction check. A startup GPC update can set sale_of_data
  // without any choice about analytics, marketing, or preferences.
  const consent = privacy.currentVisitorConsent();
  return ![consent.marketing, consent.analytics, consent.preferences].some(
    (value) => value === 'yes' || value === 'no',
  );
}
