/** Storefront API header for VisitToken */
export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
/** Storefront API header for UniqueToken */
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

type TrackingValues = {
  /** Identifier for the unique user. Equivalent to the deprecated _shopify_y cookie */
  uniqueToken: string;
  /** Identifier for the current visit. Equivalent to the deprecated _shopify_s cookie */
  visitToken: string;
  /** Represents the consent given by the user or the default region consent configured in Admin */
  consent: string;
};

// Keep the consent-tracking-api token interface out of Hydrogen's public
// global types since it could change in the future.
type CustomerPrivacyWithTracking = {
  config?: {asyncConsent?: boolean};
  cachedConsent?: string;
  __internal?: {
    uniqueToken?: (options?: {
      generateFallback?: boolean;
      tag?: string;
    }) => string | undefined;
    visitToken?: (options?: {
      generateFallback?: boolean;
      tag?: string;
    }) => string | undefined;
  };
};

/**
 * Retrieves user session tracking values for analytics and marketing from the
 * browser environment. Customer Privacy API token readers are authoritative
 * when available, including when consent denies tracking. Deprecated
 * `_shopify_y`/`_shopify_s` cookies are read only without an API token reader.
 * Consent comes from CTA's cache or the legacy `_tracking_consent` cookie.
 * @publicDocs
 */
export function getTrackingValues(): TrackingValues {
  const cookie =
    // Read from arguments to avoid declaring parameters in this function signature.
    // This logic is only used internally from `getShopifyCookies` and will be deprecated.
    typeof arguments[0] === 'string'
      ? arguments[0]
      : typeof document !== 'undefined'
        ? document.cookie
        : '';

  const customerPrivacy =
    typeof window === 'undefined'
      ? undefined
      : (window as {Shopify?: {customerPrivacy?: CustomerPrivacyWithTracking}})
          .Shopify?.customerPrivacy;

  const internal = customerPrivacy?.__internal;
  // Async consent owns initialization and suppresses fallback generation until
  // it is loaded. Afterwards CTA can refresh expired tokens, as in preview.
  // Standalone hydrogen-react's explicit consent fetch keeps its previous policy.
  const tokenOptions = {
    generateFallback: customerPrivacy?.config?.asyncConsent === true,
    tag: 'hydrogen:classic',
  };

  return {
    // An installed CTA reader is authoritative, including undefined on denial.
    // Falling through to a legacy cookie could restore a disallowed token.
    uniqueToken: internal?.uniqueToken
      ? (internal.uniqueToken(tokenOptions) ?? '')
      : (cookie.match(/\b_shopify_y=([^;]+)/)?.[1] ?? ''),
    visitToken: internal?.visitToken
      ? (internal.visitToken(tokenOptions) ?? '')
      : (cookie.match(/\b_shopify_s=([^;]+)/)?.[1] ?? ''),
    consent:
      customerPrivacy?.cachedConsent ??
      cookie.match(/\b_tracking_consent=([^;]+)/)?.[1] ??
      '',
  };
}
