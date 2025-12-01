/* Storefront API header for VisitToken */
export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
/* Storefront API header for UniqueToken */
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

type TrackingValues = {
  uniqueToken: string;
  visitToken: string;
  consent: string;
};

// Cache values to avoid losing them when performance
// entries are cleared from the buffer over time.
export const cachedTrackingValues: {
  current: null | TrackingValues;
} = {current: null};

/**
 * Retrieves session tracking values for analytics
 * and marketing from the browser environment.
 */
export function getTrackingValues(): TrackingValues {
  const trackingValues = {uniqueToken: '', visitToken: '', consent: ''};
  const hasFoundTrackingValues = () =>
    Boolean(trackingValues.uniqueToken || trackingValues.visitToken);

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      // RE to match SFAPI pathnames and extract the host.
      // E.g. "https://checkout.mystore.com/api/.../graphql.json" => "checkout.mystore.com"
      const sfapiRE =
        /^https?:\/\/([^/]+)\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json(?:$|\?)/;

      // Search backwards through resource entries to find the most recent match
      // Priority 1: Same origin SFAPI request
      // Priority 2: Any SFAPI request (different origin, but still SFAPI)
      const entries = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      let primaryMatch: PerformanceResourceTiming | undefined;
      let backupMatch: PerformanceResourceTiming | undefined;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        if (entry.initiatorType !== 'fetch') continue;

        const currentHost = window.location.host;
        const matchedHost = entry.name.match(sfapiRE)?.[1];
        if (!matchedHost) continue;

        if (
          // Exact same host
          matchedHost === currentHost ||
          // Subdomain of current host
          matchedHost.endsWith(`.${currentHost}`)
        ) {
          primaryMatch = entry;
          break;
        } else if (!backupMatch) {
          backupMatch = entry;
          // Don't break - keep looking for primary match
        }
      }

      const resourceEntry = primaryMatch || backupMatch;

      if (resourceEntry) {
        Object.assign(
          trackingValues,
          extractFromPerformanceEntry(resourceEntry),
        );
      }

      // Resource entries have a limited buffer and are removed over time.
      // Cache the latest values for future calls if we find them.
      // A cached resource entry is always newer than a navigation entry.
      if (hasFoundTrackingValues()) {
        cachedTrackingValues.current = trackingValues;
      } else if (cachedTrackingValues.current) {
        // Fallback to cached values from previous calls:
        Object.assign(trackingValues, cachedTrackingValues.current);
      }

      if (!hasFoundTrackingValues()) {
        // Fallback to navigation entry from full page rendering load:
        const navigationEntries = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;

        Object.assign(
          trackingValues,
          extractFromPerformanceEntry(navigationEntries),
        );
      }
    } catch {}
  }

  // Fallback to deprecated cookies to support transitioning:
  if (!hasFoundTrackingValues()) {
    const cookie =
      // Read from arguments to avoid declaring parameters in this function signature.
      // This logic is only used internally and will be deprecated.
      typeof arguments[0] === 'string'
        ? arguments[0]
        : typeof document !== 'undefined'
          ? document.cookie
          : '';

    Object.assign(trackingValues, {
      uniqueToken: cookie.match(/\b_shopify_y=([^;]+)/)?.[1] || '',
      visitToken: cookie.match(/\b_shopify_s=([^;]+)/)?.[1] || '',
    });
  }

  return trackingValues;
}

function extractFromPerformanceEntry(
  entry: PerformanceNavigationTiming | PerformanceResourceTiming,
) {
  let uniqueToken = '';
  let visitToken = '';
  let consent = '';

  if (entry.serverTiming) {
    for (const {name, description} of entry.serverTiming) {
      if (!name || !description) continue;

      if (name === '_y') {
        uniqueToken = description;
      } else if (name === '_s') {
        visitToken = description;
      } else if (name === '_cmp') {
        consent = description;
      }

      if (uniqueToken && visitToken && consent) break;
    }
  }

  return {uniqueToken, visitToken, consent};
}
