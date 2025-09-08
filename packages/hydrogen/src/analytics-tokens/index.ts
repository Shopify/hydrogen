// @ts-ignore - worktop/cookie types not properly exported
import {parse} from 'worktop/cookie';
import type {Storefront} from '../storefront';
import type {
  AnalyticsTokens,
  AnalyticsTokenSource,
} from '@shopify/hydrogen-react';
import {type CrossRuntimeRequest, getHeaderValue} from '../utils/request';
import {buildConsentManagementQuery} from './consent-query';

function parseServerTimingTokens(serverTimingHeader: string): {
  visitorToken?: string;
  sessionToken?: string;
} {
  const tokens: {visitorToken?: string; sessionToken?: string} = {};

  const visitorMatch = serverTimingHeader.match(/_y;desc="([^"]+)"/);
  if (visitorMatch) {
    tokens.visitorToken = visitorMatch[1];
  }

  const sessionMatch = serverTimingHeader.match(/_s;desc="([^"]+)"/);
  if (sessionMatch) {
    tokens.sessionToken = sessionMatch[1];
  }

  return tokens;
}

/**
 * Retrieves or generates analytics tokens on the server-side, maintaining a secure
 * trust boundary by only using backend-approved token sources. This is the primary
 * function for obtaining analytics tokens in server-side Hydrogen applications.
 *
 * This function implements a three-tier fallback strategy:
 * 1. Reads existing cookies if present (maintaining session continuity)
 * 2. Fetches new tokens from Shopify's Consent Management API if configured
 * 3. Generates new tokens as a last resort for analytics initialization
 *
 * @param request - The incoming HTTP request containing cookies and headers
 * @param storefront - Optional Storefront client for API authentication
 * @param checkoutDomain - Optional checkout domain for Consent API requests
 * @returns Promise resolving to analytics tokens with source attribution
 *
 * @example
 * ```typescript
 * // In your Hydrogen server context
 * const tokens = await getBackendApprovedTokens(
 *   request,
 *   context.storefront,
 *   context.env.PUBLIC_CHECKOUT_DOMAIN
 * );
 *
 * // Tokens include source for debugging
 * console.log(tokens.source); // 'existing-cookies' | 'storefront-api' | 'relay-only'
 * ```
 *
 * @remarks
 * Token sources (in priority order):
 *
 * 1. **existing-cookies**: Found valid _shopify_y and _shopify_s cookies
 *    - Maintains user session continuity
 *    - Includes consent and attribution cookies if present
 *
 * 2. **storefront-api**: Retrieved from Consent Management API
 *    - Requires storefront client and checkout domain
 *    - Returns tokens from Server-Timing headers
 *    - Includes cookieDomain configuration from API
 *
 * 3. **relay-only**: Generated new tokens
 *    - Fallback when no existing tokens found
 *    - Uses crypto.randomUUID() for secure generation
 *    - Includes landing page and referrer from request
 *
 * The function ensures analytics continuity by always returning valid tokens,
 * either by preserving existing ones or creating new ones when necessary.
 */
export async function getBackendApprovedTokens(
  request: Request | CrossRuntimeRequest,
  storefront?: Storefront,
  checkoutDomain?: string,
): Promise<AnalyticsTokens> {
  const cookieHeader = getHeaderValue(request.headers, 'Cookie');
  const cookies = parse(cookieHeader || '');

  if (cookies._shopify_y && cookies._shopify_s) {
    return {
      visitorToken: cookies._shopify_y,
      sessionToken: cookies._shopify_s,
      consentCookie: cookies._tracking_consent || '',
      landingPageCookie: cookies._landing_page || '',
      origReferrerCookie: cookies._orig_referrer || '',
      source: 'existing-cookies' as AnalyticsTokenSource,
    };
  }

  if (storefront && checkoutDomain) {
    try {
      const apiUrl = `https://${checkoutDomain.replace('https://', '')}/api/unstable/graphql.json`;
      const headers =
        storefront.getPublicTokenHeaders?.({contentType: 'json'}) || {};

      // Get current page and referrer for the API
      const currentUrl = request.url ? new URL(request.url) : null;
      const landingPage = currentUrl ? currentUrl.pathname : '/';
      const origReferrer = getHeaderValue(request.headers, 'Referer') || '';

      const query = buildConsentManagementQuery({
        visitorConsent: {
          analytics: true,
          marketing: true,
          preferences: true,
          saleOfData: true,
        },
        landingPage,
        origReferrer,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Consent API returned ${response.status}`);
      }

      const json: any = await response.json();
      const {consentManagement} = json.data || {};

      const serverTimingHeader = response.headers.get('server-timing') || '';
      const tokens = parseServerTimingTokens(serverTimingHeader);

      if (tokens.visitorToken && tokens.sessionToken) {
        const cookies = consentManagement?.cookies || {};

        return {
          visitorToken: tokens.visitorToken,
          sessionToken: tokens.sessionToken,
          consentCookie: cookies.trackingConsentCookie || '',
          landingPageCookie: cookies.landingPageCookie || landingPage || '/',
          origReferrerCookie: cookies.origReferrerCookie || origReferrer || '',
          cookieDomain: cookies.cookieDomain || '',
          source: 'storefront-api' as AnalyticsTokenSource,
        };
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[h2:analytics] Failed to fetch consent tokens:', error);
      }
    }
  }

  // Generate new tokens if none exist and we couldn't get them from API
  // Using crypto.randomUUID for secure token generation
  const generateToken = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Get landing page and referrer from request
  const landingPage = request.url ? new URL(request.url).pathname : '/';
  const referrer = getHeaderValue(request.headers, 'Referer') || '';

  return {
    visitorToken: generateToken(),
    sessionToken: generateToken(),
    landingPageCookie: landingPage,
    origReferrerCookie: referrer,
    source: 'relay-only' as AnalyticsTokenSource,
  };
}

export interface AnalyticsTokenOptions {
  /** Whether to automatically fetch analytics tokens. Defaults to true. */
  enabled?: boolean;
  /** Cookie domain for setting analytics cookies */
  cookieDomain?: string;
}
