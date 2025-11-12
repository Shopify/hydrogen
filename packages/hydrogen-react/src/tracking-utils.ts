export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

export function getTrackingValues() {
  let _y = '';
  let _s = '';

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      const navigationEntries = performance.getEntriesByType('navigation');

      if (navigationEntries && navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;

        // Server-Timing API provides cookies from the backend in a secure way
        if (navEntry.serverTiming && Array.isArray(navEntry.serverTiming)) {
          const yTiming = navEntry.serverTiming.find(
            (timing: PerformanceServerTiming) => timing.name === '_y',
          );
          const sTiming = navEntry.serverTiming.find(
            (timing: PerformanceServerTiming) => timing.name === '_s',
          );

          if (yTiming?.description) {
            _y = yTiming.description;
          }
          if (sTiming?.description) {
            _s = sTiming.description;
          }
        }
      }
    } catch {}
  }

  return {uniqueToken: _y, visitToken: _s};
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
