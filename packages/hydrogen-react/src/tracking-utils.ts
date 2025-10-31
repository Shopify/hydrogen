export const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
export const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

export function getTrackingValues(serverTimingHeader?: string) {
  let _y = '';
  let _s = '';

  if (serverTimingHeader) {
    _y = serverTimingHeader.match(/_y;desc=([^,]+)/)?.[1] || '';
    _s = serverTimingHeader.match(/_s;desc=([^,]+)/)?.[1] || '';
  } else if (
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

  return {_y, _s};
}
