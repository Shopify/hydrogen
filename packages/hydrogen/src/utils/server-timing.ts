import {HYDROGEN_SFAPI_PROXY_KEY} from '../constants';

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
