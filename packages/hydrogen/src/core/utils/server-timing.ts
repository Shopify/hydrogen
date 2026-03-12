import {
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from '../constants';

function buildServerTimingHeader(values: Record<string, string | undefined>) {
  return Object.entries(values)
    .map(([key, value]) => (value ? `${key};desc=${value}` : undefined))
    .filter(Boolean)
    .join(', ');
}

/**
 * Creates a Server-Timing header from the given values and appends it to the response.
 */
export function appendServerTimingHeader(
  response: {headers: Headers},
  values: string | Parameters<typeof buildServerTimingHeader>[0],
) {
  const header =
    typeof values === 'string' ? values : buildServerTimingHeader(values);

  if (header) {
    response.headers.append('Server-Timing', header);
  }
}

// In order: unique token, visit token, and consent
const trackedTimings = ['_y', '_s', '_cmp'] as const;

type TrackedTimingKeys = (typeof trackedTimings)[number];
export type TrackedTimingsRecord = Partial<Record<TrackedTimingKeys, string>>;

export function extractServerTimingHeader(
  serverTimingHeader?: string,
): TrackedTimingsRecord {
  const values: TrackedTimingsRecord = {};
  if (!serverTimingHeader) return values;

  const re = new RegExp(
    `\\b(${trackedTimings.join('|')});desc="?([^",]+)"?`,
    'g',
  );

  let match;
  while ((match = re.exec(serverTimingHeader)) !== null) {
    values[match[1] as TrackedTimingKeys] = match[2];
  }

  return values;
}

/**
 * Checks if a specific server-timing header is present in the navigation entry.
 */
function hasServerTimingInNavigationEntry(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const navigationEntry = window.performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    return !!navigationEntry?.serverTiming?.some((entry) => entry.name === key);
  } catch (e) {
    return false;
  }
}

/**
 * Checks if the SFAPI proxy is enabled by looking for the
 * _sfapi_proxy server-timing header in the navigation entry.
 */
export function isSfapiProxyEnabled(): boolean {
  return hasServerTimingInNavigationEntry(HYDROGEN_SFAPI_PROXY_KEY);
}

/**
 * Checks if the backend already fetched tracking values by looking for
 * the _server_tracking server-timing header in the navigation entry.
 */
export function hasServerReturnedTrackingValues(): boolean {
  return hasServerTimingInNavigationEntry(HYDROGEN_SERVER_TRACKING_KEY);
}
