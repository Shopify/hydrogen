/**
 * @deprecated This module manages the legacy `_shopify_y` and `_shopify_s`
 * JavaScript-visible cookies. Modern Shopify storefronts use http-only cookies
 * set by the Storefront API via the SFAPI proxy. This module exists only for
 * backward compatibility with downstream systems that may still read these
 * JS cookies directly.
 *
 * To remove: delete this file and remove the single import/call in bus.ts.
 */

import { findWritableCookieDomain } from "./utils/cookie-domain";
import { getTrackingValues } from "./utils/tracking-values";
import { buildUUID } from "./utils/uuid";

const SHOPIFY_Y = "_shopify_y";
const SHOPIFY_S = "_shopify_s";

const LONG_TERM_EXPIRY_IN_SECONDS = 60 * 60 * 24 * 360;
const SHORT_TERM_EXPIRY_IN_SECONDS = 60 * 30;

type DeprecatedCookieDeps = {
  canTrack: () => boolean;
  consentDomain?: string;
  cookieDomain?: string;
};

type DeprecatedCookieController = {
  syncPageView: () => void;
  sync: () => void;
};

/**
 * Computes the cookie domain as the broadest wildcard domain the browser will
 * accept for the consent domain. Returns empty string for localhost or when
 * probing fails (cookies use current domain).
 *
 * @deprecated Part of legacy cookie management.
 */
export function computeCookieDomain(consentDomain?: string, overrideDomain?: string): string {
  if (typeof window === "undefined") return "";

  return findWritableCookieDomain(overrideDomain || consentDomain || window.location.host);
}

function setCookie(name: string, value: string, maxAgeInSeconds: number, domain: string): void {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`max-age=${maxAgeInSeconds}`);
  parts.push("path=/");
  parts.push("SameSite=Lax");
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join("; ");
}

/**
 * @deprecated Sets or removes the legacy `_shopify_y` and `_shopify_s` cookies
 * based on the current consent state and tracking values.
 */
function updateCookies(hasConsent: boolean, domain: string): void {
  if (hasConsent) {
    const trackingValues = getTrackingValues();
    const tokenValue = trackingValues.uniqueToken || trackingValues.visitToken || "";
    if (tokenValue.startsWith("00000000-")) return;

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
    setCookie(SHOPIFY_Y, "", 0, domain);
    setCookie(SHOPIFY_S, "", 0, domain);
  }
}

/**
 * @deprecated Initializes legacy cookie management on the analytics bus.
 * Exposes an explicit sync hook for consent readiness and refreshes cookies on
 * page view events.
 *
 * To remove this feature: delete this file and remove the import/call in bus.ts.
 */
export function initDeprecatedCookies(deps: DeprecatedCookieDeps): DeprecatedCookieController {
  const { canTrack, consentDomain, cookieDomain } = deps;
  const domain = cookieDomain ?? computeCookieDomain(consentDomain);

  return {
    syncPageView: () => {
      if (canTrack()) {
        updateCookies(true, domain);
      }
    },
    sync: () => updateCookies(canTrack(), domain),
  };
}
