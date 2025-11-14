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

export function getTrackingValues() {
  const trackingValues = {uniqueToken: '', visitToken: ''};

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

      if (!trackingValues.uniqueToken && !trackingValues.visitToken) {
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

  return trackingValues;
}

export function getTrackingValuesFromHeader(serverTimingHeader: string) {
  const _y = serverTimingHeader.match(/_y;desc="?([^",]+)/)?.[1];
  const _s = serverTimingHeader.match(/_s;desc="?([^",]+)/)?.[1];
  const _cmp = serverTimingHeader.match(/_cmp;desc="?([^",]+)/)?.[1];

  const serverTiming = [];
  if (_y) serverTiming.push(`_y;desc=${_y}`);
  if (_s) serverTiming.push(`_s;desc=${_s}`);
  if (_cmp) serverTiming.push(`_cmp;desc=${_cmp}`);

  return {
    uniqueToken: _y,
    visitToken: _s,
    consent: _cmp,
    serverTiming: serverTiming.join(', '),
  };
}
