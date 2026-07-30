/**
 * @deprecated This module manages the legacy `_shopify_y` and `_shopify_s`
 * JavaScript-visible cookies. Modern Shopify storefronts use http-only cookies
 * set by the Storefront API via the SFAPI proxy. This module exists only for
 * backward compatibility with downstream systems that may still read these
 * JS cookies directly.
 *
 * To remove: delete this file and remove the ShopifyScripts startup call.
 */

import { VISITOR_CONSENT_COLLECTED_EVENT } from "./constants";
import { findWritableCookieDomain } from "./utils/cookie-domain";
import { getTrackingValues } from "./utils/tracking-values";
import { buildUUID } from "./utils/uuid";

const SHOPIFY_Y = "_shopify_y";
const SHOPIFY_S = "_shopify_s";

const LONG_TERM_EXPIRY_IN_SECONDS = 60 * 60 * 24 * 360;
const SHORT_TERM_EXPIRY_IN_SECONDS = 60 * 30;

/**
 * Computes the cookie domain as the broadest wildcard domain the browser will
 * accept for the consent domain. Returns empty string for localhost or when
 * probing fails (cookies use current domain).
 *
 * @deprecated Part of legacy cookie management.
 */
export function computeCookieDomain(consentDomain?: string): string {
  if (typeof window === "undefined") return "";

  return findWritableCookieDomain(consentDomain || window.location.host);
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

function hasAnalyticsConsent(): boolean {
  try {
    const privacy = window.Shopify?.customerPrivacy;
    return privacy?.analyticsProcessingAllowed?.() ?? false;
  } catch {
    return false;
  }
}

function isConsentLoaded(): boolean {
  return window.Shopify?.customerPrivacy?.consentStatus === "loaded";
}

function getConsentDomain(): string | undefined {
  return window.Shopify?.customerPrivacy?.config?.consentDomain;
}

let didInitializeDeprecatedCookies = false;
const noOpCleanup = () => {};

/**
 * @deprecated Starts page-lifetime legacy cookie management from ShopifyScripts.
 */
export function initializeDeprecatedCookies(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return noOpCleanup;
  if (didInitializeDeprecatedCookies) return noOpCleanup;

  didInitializeDeprecatedCookies = true;
  const domain = computeCookieDomain(getConsentDomain());

  const syncConsent = () => {
    updateCookies(hasAnalyticsConsent(), domain);
  };

  document.addEventListener(VISITOR_CONSENT_COLLECTED_EVENT, syncConsent);
  if (isConsentLoaded()) syncConsent();

  const syncPageView = () => {
    if (hasAnalyticsConsent()) {
      updateCookies(true, domain);
    }
  };

  const subscribeToAnalytics = () => {
    const subscribe = window.Shopify?.analytics?.subscribe;
    if (typeof subscribe !== "function") return false;

    subscribe("page_viewed", syncPageView);
    return true;
  };

  if (!subscribeToAnalytics() && document.readyState === "loading") {
    // The bus is inline today, but if it moves to a module/defer script it will
    // still be available before DOMContentLoaded.
    document.addEventListener("DOMContentLoaded", subscribeToAnalytics, { once: true });
  }

  return noOpCleanup;
}
