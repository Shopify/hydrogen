/**
 * Inlined from @shopify/hydrogen-react/tracking-utils.
 * Retrieves user session tracking values from Server-Timing headers
 * and the Performance API.
 */

export type TrackingValues = {
  uniqueToken: string;
  visitToken: string;
  consent: string;
};

const cachedTrackingValues: {current: null | TrackingValues} = {current: null};

export function getTrackingValues(): TrackingValues {
  let trackingValues: TrackingValues | undefined;

  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      const resourceRE =
        /^https?:\/\/([^/]+)(\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json(?=$|\?))?/;

      const entries = performance.getEntriesByType(
        'resource',
      ) as PerformanceResourceTiming[];

      let matchedValues: TrackingValues | undefined;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.initiatorType !== 'fetch') continue;

        const currentHost = window.location.host;
        const match = entry.name.match(resourceRE);
        if (!match) continue;

        const [, matchedHost, sfapiPath] = match;
        const isMatch =
          matchedHost === currentHost ||
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

      if (trackingValues) {
        cachedTrackingValues.current = trackingValues;
      } else if (cachedTrackingValues.current) {
        trackingValues = cachedTrackingValues.current;
      }

      if (!trackingValues) {
        const navigationEntries = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;
        trackingValues = extractFromPerformanceEntry(navigationEntries, false);
      }
    } catch {}
  }

  if (!trackingValues) {
    const cookie = typeof document !== 'undefined' ? document.cookie : '';

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
  if (serverTiming && serverTiming.length >= 3) {
    for (let i = serverTiming.length - 1; i >= 0; i--) {
      const {name, description} = serverTiming[i];
      if (!name || !description) continue;

      if (name === '_y') uniqueToken = description;
      else if (name === '_s') visitToken = description;
      else if (name === '_cmp') consent = description;

      if (uniqueToken && visitToken && consent) break;
    }
  }

  return uniqueToken && visitToken && (isConsentRequired ? consent : true)
    ? {uniqueToken, visitToken, consent}
    : undefined;
}