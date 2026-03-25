/**
 * Inlined from @shopify/hydrogen-react/analytics.
 * Collects browser parameters for analytics payloads.
 */

import {getTrackingValues} from './tracking-values';

export type ClientBrowserParameters = {
  uniqueToken: string;
  visitToken: string;
  url: string;
  path: string;
  search: string;
  referrer: string;
  title: string;
  userAgent: string;
  navigationType: string;
  navigationApi: string;
};

export function getClientBrowserParameters(): ClientBrowserParameters {
  if (typeof document === 'undefined') {
    return {
      uniqueToken: '',
      visitToken: '',
      url: '',
      path: '',
      search: '',
      referrer: '',
      title: '',
      userAgent: '',
      navigationType: '',
      navigationApi: '',
    };
  }

  const [navigationType, navigationApi] = getNavigationType();
  const trackingValues = getTrackingValues();

  return {
    uniqueToken: trackingValues.uniqueToken,
    visitToken: trackingValues.visitToken,
    url: location.href,
    path: location.pathname,
    search: location.search,
    referrer: document.referrer,
    title: document.title,
    userAgent: navigator.userAgent,
    navigationType,
    navigationApi,
  };
}

function getNavigationType(): [string, string] {
  try {
    let navApi = 'PerformanceNavigationTiming';
    let navType = getNavigationTypeExperimental();
    if (!navType) {
      navType = getNavigationTypeLegacy();
      navApi = 'performance.navigation';
    }
    if (navType) return [navType, navApi];
    return ['unknown', 'unknown'];
  } catch {
    return ['error', 'error'];
  }
}

function getNavigationTypeExperimental(): string | undefined {
  try {
    const navigationEntries = performance?.getEntriesByType?.('navigation');
    if (navigationEntries?.[0]) {
      const rawType = (navigationEntries[0] as PerformanceNavigationTiming)
        .type;
      return rawType?.toString();
    }
  } catch {}
  return undefined;
}

function getNavigationTypeLegacy(): string | undefined {
  try {
    if (
      performance?.navigation?.type !== null &&
      performance?.navigation?.type !== undefined
    ) {
      const rawType = performance.navigation.type;
      switch (rawType) {
        case PerformanceNavigation.TYPE_NAVIGATE:
          return 'navigate';
        case PerformanceNavigation.TYPE_RELOAD:
          return 'reload';
        case PerformanceNavigation.TYPE_BACK_FORWARD:
          return 'back_forward';
        default:
          return `unknown: ${rawType}`;
      }
    }
  } catch {}
  return undefined;
}
