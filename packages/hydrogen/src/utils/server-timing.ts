import {
  HYDROGEN_SFAPI_PROXY_KEY,
  HYDROGEN_SERVER_TRACKING_KEY,
} from '../constants';
import {appendHeader, CrossRuntimeResponse} from './response';

export function appendServerTimingHeader(
  response: CrossRuntimeResponse,
  values: Record<string, string>,
) {
  const headerValues = Object.entries(values)
    .map(([key, value]) => (value ? `${key};desc=${value}` : undefined))
    .filter(Boolean);

  appendHeader(response, 'Server-Timing', headerValues.join(', '));
}

/**
 * Checks if a specific server-timing header is present in the navigation entry.
 */
function hasServerTiming(key: string): boolean {
  if (typeof window === 'undefined') return false;

  const navigationEntry = window.performance.getEntriesByType(
    'navigation',
  )[0] as PerformanceNavigationTiming;

  return !!navigationEntry?.serverTiming?.some((entry) => entry.name === key);
}

/**
 * Checks if the SFAPI proxy is enabled by looking for the
 * _sfapi_proxy server-timing header in the navigation entry.
 */
export function isSfapiProxyEnabled(): boolean {
  return hasServerTiming(HYDROGEN_SFAPI_PROXY_KEY);
}

/**
 * Checks if the backend already fetched tracking values by looking for
 * the _server_tracking server-timing header in the navigation entry.
 */
export function hasBackendFetchedTracking(): boolean {
  return hasServerTiming(HYDROGEN_SERVER_TRACKING_KEY);
}
