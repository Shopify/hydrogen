/**
 * @deprecated This module manages the legacy `_shopify_y` and `_shopify_s`
 * JavaScript-visible cookies. Modern Shopify storefronts use http-only cookies
 * set by the Storefront API via the SFAPI proxy. This module exists only for
 * backward compatibility with downstream systems that may still read these
 * JS cookies directly.
 *
 * To remove: delete this file and remove the single import/call in bus.ts.
 */

import {getTrackingValues} from './utils/tracking-values';
import {buildUUID} from './utils/uuid';
import {AnalyticsEvent} from './events';

const SHOPIFY_Y = '_shopify_y';
const SHOPIFY_S = '_shopify_s';

const LONG_TERM_EXPIRY_IN_SECONDS = 60 * 60 * 24 * 360; // ~1 year
const SHORT_TERM_EXPIRY_IN_SECONDS = 60 * 30; // 30 min

type DeprecatedCookieDeps = {
  subscribe: (event: string, callback: (payload: any) => void) => () => void;
  canTrack: () => boolean;
  checkoutDomain: string;
  cookieDomain?: string;
};

/**
 * Computes the cookie domain as the common ancestor of the current host and
 * the checkout domain, with a leading dot for cross-subdomain sharing.
 * Returns empty string for localhost (cookies use current domain).
 *
 * @deprecated Part of legacy cookie management.
 */
function computeCookieDomain(
  checkoutDomain: string,
  overrideDomain?: string,
): string {
  if (typeof window === 'undefined') return '';

  let currentDomain = overrideDomain || window.location.host;

  if (checkoutDomain) {
    const checkoutParts = checkoutDomain.split('.').reverse();
    const currentParts = currentDomain.split('.').reverse();
    const sameParts: string[] = [];
    checkoutParts.forEach((part, index) => {
      if (part === currentParts[index]) sameParts.push(part);
    });
    currentDomain = sameParts.reverse().join('.');
  }

  if (/^localhost/.test(currentDomain)) return '';

  return currentDomain
    ? currentDomain.startsWith('.')
      ? currentDomain
      : `.${currentDomain}`
    : '';
}

function setCookie(
  name: string,
  value: string,
  maxAgeInSeconds: number,
  domain: string,
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`max-age=${maxAgeInSeconds}`);
  parts.push('path=/');
  parts.push('SameSite=Lax');
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join('; ');
}

/**
 * @deprecated Sets or removes the legacy `_shopify_y` and `_shopify_s` cookies
 * based on the current consent state and tracking values.
 */
function updateCookies(hasConsent: boolean, domain: string): void {
  if (hasConsent) {
    const trackingValues = getTrackingValues();
    const tokenValue =
      trackingValues.uniqueToken || trackingValues.visitToken || '';
    if (tokenValue.startsWith('00000000-')) return;

    setCookie(
      SHOPIFY_Y,
      trackingValues.uniqueToken || buildUUID(),
      LONG_TERM_EXPIRY_IN_SECONDS,
      domain,
    );
    setCookie(
      SHOPIFY_S,
      trackingValues.visitToken || buildUUID(),
      SHORT_TERM_EXPIRY_IN_SECONDS,
      domain,
    );
  } else {
    setCookie(SHOPIFY_Y, '', 0, domain);
    setCookie(SHOPIFY_S, '', 0, domain);
  }
}

/**
 * @deprecated Initializes legacy cookie management on the analytics bus.
 * Subscribes to consent and page view events to set/refresh/remove cookies.
 *
 * To remove this feature: delete this file and remove the import/call in bus.ts.
 */
export function initDeprecatedCookies(deps: DeprecatedCookieDeps): () => void {
  const {subscribe, canTrack, checkoutDomain, cookieDomain} = deps;
  const domain = computeCookieDomain(checkoutDomain, cookieDomain);

  const unsubConsent = subscribe(AnalyticsEvent.CONSENT_COLLECTED, () => {
    updateCookies(canTrack(), domain);
  });

  const unsubPageView = subscribe(AnalyticsEvent.PAGE_VIEWED, () => {
    if (canTrack()) {
      updateCookies(true, domain);
    }
  });

  return () => {
    unsubConsent();
    unsubPageView();
  };
}

// Exported for testing
export {computeCookieDomain as _computeCookieDomainForTesting};