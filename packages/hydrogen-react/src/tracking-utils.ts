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

/**
 * Tracking values returned in a `consentManagement` response body. A `null`
 * value is the backend's signal that consent was not granted, so no value
 * exists for that field.
 */
export type ConsentResponseValues = {
  uniqueToken: string | null;
  visitToken: string | null;
  consent: string | null;
};

/**
 * The outcome of the browser consent fetch. Carried in a component-scoped
 * ref (see `useShopifyCookies`' `consentResultRef` option) so the component
 * that initiated the fetch — e.g. Hydrogen's `useCustomerPrivacy` — can
 * consume the result without module-level state.
 */
export type ConsentFetchResult =
  | {status: 'succeeded'; values: ConsentResponseValues}
  | {status: 'failed'};

// Consent-management responses are the only token channel, so Hydrogen never
// asks the Customer Privacy API to generate fallback tokens: minting new
// tokens would fire a background persist request that races Hydrogen's own
// consent fetch.
const NO_FALLBACK_TOKEN_OPTIONS = {
  generateFallback: false,
  tag: 'hydrogen:classic',
} as const;

// Keep the consent-tracking-api token interface out of Hydrogen's public
// global types since it could change in the future.
type CustomerPrivacyWithTracking = {
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
 * browser environment. Values are read, in order, from the Customer Privacy
 * API (`window.Shopify.customerPrivacy`) and the deprecated `_shopify_y`/
 * `_shopify_s`/`_tracking_consent` cookies during the transition period.
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

  return {
    uniqueToken:
      internal?.uniqueToken?.(NO_FALLBACK_TOKEN_OPTIONS) ??
      cookie.match(/\b_shopify_y=([^;]+)/)?.[1] ??
      '',
    visitToken:
      internal?.visitToken?.(NO_FALLBACK_TOKEN_OPTIONS) ??
      cookie.match(/\b_shopify_s=([^;]+)/)?.[1] ??
      '',
    consent:
      customerPrivacy?.cachedConsent ??
      cookie.match(/\b_tracking_consent=([^;]+)/)?.[1] ??
      '',
  };
}
