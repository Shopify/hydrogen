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
      // RE to extract host and optionally match SFAPI pathname.
      // Group 1: host (e.g. "checkout.mystore.com")
      // Group 2: SFAPI path if present (e.g. "/api/2024-01/graphql.json")
      const resourceRE =
        /^https?:\/\/([^/]+)(\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json(?=$|\?))?/;

      // Search backwards through resource entries to find the most recent match.
      // Match criteria (first one with _y and _s values wins):
      // - Same origin (exact host match) with tracking values, OR
      // - Subdomain + SFAPI path with tracking values
      const entries = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      let matchedValues:
        | ReturnType<typeof extractFromPerformanceEntry>
        | undefined;

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
          if (values.uniqueToken && values.visitToken) {
            matchedValues = values;
            break;
          }
        }
      }

      if (matchedValues) {
        Object.assign(trackingValues, matchedValues);
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

  const serverTiming = entry.serverTiming;
  // Quick check: we need at least 3 entries
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
        consent = description;
      }

      if (uniqueToken && visitToken && consent) break;
    }
  }

  return {uniqueToken, visitToken, consent};
}
