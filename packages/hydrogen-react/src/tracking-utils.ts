export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

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

let cachedTrackingValues: {uniqueToken: string; visitToken: string} | null =
  null;

export function getTrackingValues() {
  const trackingValues = {uniqueToken: '', visitToken: ''};
  const hasFoundTrackingValues = () =>
    Boolean(trackingValues.uniqueToken || trackingValues.visitToken);

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      // Try server-timing from fetch requests first as these are newer:
      const resourceEntry = (
        performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      ).findLast(
        (entry) =>
          entry.initiatorType === 'fetch' &&
          entry.name ===
            new URL(
              '/api/unstable/graphql.json',
              window.location.origin,
            ).toString(),
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
        cachedTrackingValues = trackingValues;
      } else if (cachedTrackingValues) {
        // Fallback to cached values from previous calls:
        Object.assign(trackingValues, cachedTrackingValues);
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
      uniqueToken: cookie.match(/_y=([^;]+)/)?.[1] || '',
      visitToken: cookie.match(/_s=([^;]+)/)?.[1] || '',
    });
  }

  return trackingValues;
}

export function getTrackingValuesFromHeader(serverTimingHeader: string) {
  const _y = serverTimingHeader.match(/_y;desc="?([^",]+)/)?.[1];
  const _s = serverTimingHeader.match(/_s;desc="?([^",]+)/)?.[1];
  const _cmp = serverTimingHeader.match(/_cmp;desc="?([^",]+)/)?.[1];
  const _ny = serverTimingHeader.match(/_ny;desc="?([^",]+)/)?.[1];

  const serverTiming = [];
  if (_y) serverTiming.push(`_y;desc=${_y}`);
  if (_s) serverTiming.push(`_s;desc=${_s}`);
  if (_cmp) serverTiming.push(`_cmp;desc=${_cmp}`);
  if (_ny) serverTiming.push(`_ny;desc=${_ny}`);

  return {
    uniqueToken: _y,
    visitToken: _s,
    consent: _cmp,
    serverTiming: serverTiming.join(', '),
  };
}
