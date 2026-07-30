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

const cachedTrackingValues: { current: null | TrackingValues } = { current: null };

export function getTrackingValues(): TrackingValues {
  // Tracking values are returned in Server-Timing headers from SFAPI responses.
  // Prefer recent fetch/resource entries, then cached values, then the initial
  // navigation entry, and finally the deprecated JS-visible cookies.
  let trackingValues: TrackingValues | undefined;

  if (typeof window !== "undefined" && typeof window.performance !== "undefined") {
    try {
      // Extract host and optionally match the SFAPI GraphQL pathname.
      const resourceRE =
        /^https?:\/\/([^/]+)(\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json(?=$|\?))?/;

      // Search backwards so the latest matching fetch with complete tracking
      // values wins. Same-origin fetches cover Hydrogen proxy/server responses;
      // subdomain SFAPI requests cover direct Storefront API calls.
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      let matchedValues: TrackingValues | undefined;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.initiatorType !== "fetch") continue;

        const currentHost = window.location.host;
        const match = entry.name.match(resourceRE);
        if (!match) continue;

        const [, matchedHost, sfapiPath] = match;
        const isMatch =
          matchedHost === currentHost || (sfapiPath && matchedHost?.endsWith(`.${currentHost}`));

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

      // Resource entries have a limited buffer and can be removed over time.
      // A cached resource entry is newer than the navigation entry.
      if (trackingValues) {
        cachedTrackingValues.current = trackingValues;
      } else if (cachedTrackingValues.current) {
        trackingValues = cachedTrackingValues.current;
      }

      if (!trackingValues) {
        // The document navigation entry can omit _cmp when the server generated
        // tracking tokens, so only _y and _s are required for this fallback.
        const navigationEntries = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        trackingValues = extractFromPerformanceEntry(navigationEntries, false);
      }
    } catch {}
  }

  if (!trackingValues) {
    const cookie = typeof document !== "undefined" ? document.cookie : "";

    trackingValues = {
      uniqueToken: cookie.match(/\b_shopify_y=([^;]+)/)?.[1] || "",
      visitToken: cookie.match(/\b_shopify_s=([^;]+)/)?.[1] || "",
      consent: cookie.match(/\b_tracking_consent=([^;]+)/)?.[1] || "",
    };
  }

  return trackingValues;
}

function extractFromPerformanceEntry(
  entry: PerformanceNavigationTiming | PerformanceResourceTiming,
  isConsentRequired = true,
): TrackingValues | undefined {
  let uniqueToken = "";
  let visitToken = "";
  let consent = "";

  const serverTiming = entry.serverTiming;
  const minimumEntries = isConsentRequired ? 3 : 2;
  if (serverTiming && serverTiming.length >= minimumEntries) {
    // Iterate backwards since Shopify tracking metrics are usually appended
    // after framework/server metrics.
    for (let i = serverTiming.length - 1; i >= 0; i--) {
      const { name, description } = serverTiming[i];
      if (!name || !description) continue;

      if (name === "_y") uniqueToken = description;
      else if (name === "_s") visitToken = description;
      else if (name === "_cmp") {
        // Consent value used by consent-tracking-api and privacy-banner scripts.
        consent = description;
      }

      if (uniqueToken && visitToken && consent) break;
    }
  }

  return uniqueToken && visitToken && (isConsentRequired ? consent : true)
    ? { uniqueToken, visitToken, consent }
    : undefined;
}
