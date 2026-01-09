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

// Cache values to avoid losing them when performance
// entries are cleared from the buffer over time.
export const cachedTrackingValues: {
  current: null | TrackingValues;
} = {current: null};

/**
 * Retrieves user session tracking values for analytics
 * and marketing from the browser environment.
 */
export function getTrackingValues(): TrackingValues {
  // Overall behavior: Tracking values are returned in Server-Timing headers from
  // Storefront API responses, and we want to find and return these tracking values.
  //
  // Search recent fetches for SFAPI requests matching either: same origin (proxy case)
  // or a subdomain of the current host (eg: checkout subdomain, if there is no proxy).
  // We consider SF API-like endpoints (/api/.../graphql.json) on subdomains, as well as
  // any same-origin request. The reason for the latter is that Hydrogen server collects
  // tracking values and returns them in any non-cached response, not just direct SF API
  // responses. For example, a cart mutation in a server action could return tracking values.
  //
  // If we didn't find tracking values in fetch requests, we fall back to checking cached values,
  // then the initial page navigation entry, and finally the deprecated `_shopify_s` and `_shopify_y`.

  let trackingValues: TrackingValues | undefined;

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      // RE to extract host and optionally match SFAPI pathname.
      // Group 1: host (e.g. "checkout.mystore.com")
      // Group 2: SFAPI path if present (e.g. "/api/2024-01/graphql.json")
      const resourceRE =
        /^https?:\/\/([^/]+)(\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json(?=$|\?))?/;

      // Search backwards through resource entries to find the most recent match.
      // Match criteria (first one with _y and _s values wins):
      // - Same origin (exact host match) with tracking values, OR
      // - Subdomain + SFAPI pathname with tracking values
      const entries = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      let matchedValues: ReturnType<typeof extractFromPerformanceEntry>;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        if (entry.initiatorType !== 'fetch') continue;

        const currentHost = window.location.host;
        const match = entry.name.match(resourceRE);
        if (!match) continue;

        const [, matchedHost, sfapiPath] = match;

        const isMatch =
          // Same origin (exact host match)
          matchedHost === currentHost ||
          // Subdomain with SFAPI path
          (sfapiPath && matchedHost?.endsWith(`.${currentHost}`));

        if (isMatch) {
          const values = extractFromPerformanceEntry(entry);
          if (values) {
            matchedValues = values;
            break;
          }
        }
      }

      if (matchedValues) {
        trackingValues = matchedValues;
      }

      // Resource entries have a limited buffer and are removed over time.
      // Cache the latest values for future calls if we find them.
      // A cached resource entry is always newer than a navigation entry.
      if (trackingValues) {
        cachedTrackingValues.current = trackingValues;
      } else if (cachedTrackingValues.current) {
        // Fallback to cached values from previous calls:
        trackingValues = cachedTrackingValues.current;
      }

      if (!trackingValues) {
        // Fallback to navigation entry from full page rendering load:
        const navigationEntries = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        // Navigation entries might omit consent when the Hydrogen server generates it.
        // In this case, we skip consent requirement and only extract _y and _s values.
        trackingValues = extractFromPerformanceEntry(navigationEntries, false);
      }
    } catch {}
  }

  // Fallback to deprecated cookies to support transitioning:
  if (!trackingValues) {
    const cookie =
      // Read from arguments to avoid declaring parameters in this function signature.
      // This logic is only used internally from `getShopifyCookies` and will be deprecated.
      typeof arguments[0] === 'string'
        ? arguments[0]
        : typeof document !== 'undefined'
          ? document.cookie
          : '';

    trackingValues = {
      uniqueToken: cookie.match(/\b_shopify_y=([^;]+)/)?.[1] || '',
      visitToken: cookie.match(/\b_shopify_s=([^;]+)/)?.[1] || '',
      consent: cookie.match(/\b_tracking_consent=([^;]+)/)?.[1] || '',
    };
  }

  return trackingValues;
}

function extractFromPerformanceEntry(
  entry: PerformanceNavigationTiming | PerformanceResourceTiming,
  isConsentRequired = true,
): TrackingValues | undefined {
  let uniqueToken = '';
  let visitToken = '';
  let consent = '';

  const serverTiming = entry.serverTiming;
  // Quick check: we need at least 3 entries (_y, _s, _cmp)
  if (serverTiming && serverTiming.length >= 3) {
    // Iterate backwards since our headers are typically at the end
    for (let i = serverTiming.length - 1; i >= 0; i--) {
      const {name, description} = serverTiming[i];
      if (!name || !description) continue;

      if (name === '_y') {
        uniqueToken = description;
      } else if (name === '_s') {
        visitToken = description;
      } else if (name === '_cmp') {
        // _cmp (consent management platform) holds the consent value
        // used by consent-tracking-api and privacy-banner scripts.
        consent = description;
      }

      if (uniqueToken && visitToken && consent) break;
    }
  }

  return uniqueToken && visitToken && (isConsentRequired ? consent : true)
    ? {uniqueToken, visitToken, consent}
    : undefined;
}
