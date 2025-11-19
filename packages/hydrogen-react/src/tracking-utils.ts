export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

type TrackingValues = {
  uniqueToken: string;
  visitToken: string;
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
  const trackingValues = {uniqueToken: '', visitToken: ''};
  const hasFoundTrackingValues = () =>
    Boolean(trackingValues.uniqueToken || trackingValues.visitToken);

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      const sfapiEndpointRE = new RegExp(
        `^${window.location.origin}/api/(unstable|2\\d{3}-\\d{2})/graphql\\.json$`,
      );

      // Try server-timing from fetch requests first as these are newer:
      const resourceEntry = (
        performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      ).findLast(
        (entry) =>
          entry.initiatorType === 'fetch' && sfapiEndpointRE.test(entry.name),
      );

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
  if (!hasFoundTrackingValues() && typeof document !== 'undefined') {
    const cookie = document.cookie || '';
    Object.assign(trackingValues, {
      uniqueToken: cookie.match(/\b_shopify_y=([^;]+)/)?.[1] || '',
      visitToken: cookie.match(/\b_shopify_s=([^;]+)/)?.[1] || '',
    });
  }

  return trackingValues;
}

type TrackingValuesForServerTiming = Partial<TrackingValues> & {
  consent?: string;
  serverTiming: string;
};

/**
 * Parses tracking values from a Server-Timing header string.
 */
export function getTrackingValuesFromHeader(
  serverTimingHeader: string,
): TrackingValuesForServerTiming {
  const values = new Map<string, string>();
  const re = /\b(_y|_s|_cmp|_ny);desc="?([^",]+)"?/g;

  let match;
  while ((match = re.exec(serverTimingHeader)) !== null) {
    values.set(match[1], match[2]);
  }

  return {
    uniqueToken: values.get('_y'),
    visitToken: values.get('_s'),
    consent: values.get('_cmp'),
    serverTiming: [...values]
      .map(([key, value]) => `${key};desc=${value}`)
      .join(', '),
  };
}

function extractFromPerformanceEntry(
  entry: PerformanceNavigationTiming | PerformanceResourceTiming,
) {
  let uniqueToken = '';
  let visitToken = '';

  if (entry.serverTiming && Array.isArray(entry.serverTiming)) {
    const yTiming = entry.serverTiming.find(
      (timing: PerformanceServerTiming) => timing.name === '_y',
    );
    const sTiming = entry.serverTiming.find(
      (timing: PerformanceServerTiming) => timing.name === '_s',
    );

    if (yTiming?.description) {
      uniqueToken = yTiming.description;
    }
    if (sTiming?.description) {
      visitToken = sTiming.description;
    }
  }

  return {uniqueToken, visitToken};
}
