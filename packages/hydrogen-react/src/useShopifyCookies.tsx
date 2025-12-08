import {useEffect, useRef, useState} from 'react';
// @ts-ignore - worktop/cookie types not properly exported
import {stringify} from 'worktop/cookie';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';
import {buildUUID} from './cookies-utils.js';
import {
  getTrackingValues,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from './tracking-utils.js';

const longTermLength = 60 * 60 * 24 * 360 * 1; // ~1 year expiry
const shortTermLength = 60 * 30; // 30 mins

type UseShopifyCookiesOptions = CoreShopifyCookiesOptions & {
  /**
   * If set to `false`, Shopify cookies will be removed.
   * If set to `true`, Shopify unique user token cookie will have cookie expiry of 1 year.
   * Defaults to false.
   **/
  hasUserConsent?: boolean;
  /**
   * The domain scope of the cookie. Defaults to empty string.
   **/
  domain?: string;
  /**
   * The checkout domain of the shop. Defaults to empty string. If set, the cookie domain will check if it can be set with the checkout domain.
   */
  checkoutDomain?: string;
  /**
   * If set to `true`, it skips modifying the deprecated shopify_y and shopify_s cookies.
   */
  ignoreDeprecatedCookies?: boolean;
};

/**
 * Sets the `shopify_y` and `shopify_s` cookies in the browser based on user consent
 * for backward compatibility support.
 *
 * If `fetchTrackingValues` is true, it makes a request to Storefront API
 * to fetch or refresh Shopiy analytics and marketing cookies and tracking values.
 * Generally speaking, this should only be needed if you're not using Hydrogen's
 * built-in analytics components and hooks that already handle this automatically.
 * For example, set it to `true` if you are using `hydrogen-react` only with
 * a different framework and still need to make a same-domain request to
 * Storefront API to set cookies.
 *
 * @returns `true` when cookies are set and ready.
 */
export function useShopifyCookies(options?: UseShopifyCookiesOptions): boolean {
  const {
    hasUserConsent,
    domain = '',
    checkoutDomain = '',
    storefrontAccessToken,
    fetchTrackingValues,
    ignoreDeprecatedCookies = false,
  } = options || {};

  const coreCookiesReady = useCoreShopifyCookies({
    storefrontAccessToken,
    fetchTrackingValues,
    checkoutDomain,
  });

  useEffect(() => {
    if (ignoreDeprecatedCookies || !coreCookiesReady) return;

    /**
     * Setting cookie with domain
     *
     * If no domain is provided, the cookie will be set for the current host.
     * For Shopify, we need to ensure this domain is set with a leading dot.
     */

    // Use override domain or current host
    let currentDomain = domain || window.location.host;

    if (checkoutDomain) {
      const checkoutDomainParts = checkoutDomain.split('.').reverse();
      const currentDomainParts = currentDomain.split('.').reverse();
      const sameDomainParts: Array<string> = [];
      checkoutDomainParts.forEach((part, index) => {
        if (part === currentDomainParts[index]) {
          sameDomainParts.push(part);
        }
      });

      currentDomain = sameDomainParts.reverse().join('.');
    }

    // Reset domain if localhost
    if (/^localhost/.test(currentDomain)) currentDomain = '';

    // Shopify checkout only consumes cookies set with leading dot domain
    const domainWithLeadingDot = currentDomain
      ? /^\./.test(currentDomain)
        ? currentDomain
        : `.${currentDomain}`
      : '';

    /**
     * Set user and session cookies and refresh the expiry time
     */
    if (hasUserConsent) {
      const trackingValues = getTrackingValues();
      if (
        (
          trackingValues.uniqueToken ||
          trackingValues.visitToken ||
          ''
        ).startsWith('00000000-')
      ) {
        // Skip writing cookies when tracking values signal we don't have consent yet
        return;
      }

      setCookie(
        SHOPIFY_Y,
        trackingValues.uniqueToken || buildUUID(),
        longTermLength,
        domainWithLeadingDot,
      );
      setCookie(
        SHOPIFY_S,
        trackingValues.visitToken || buildUUID(),
        shortTermLength,
        domainWithLeadingDot,
      );
    } else {
      setCookie(SHOPIFY_Y, '', 0, domainWithLeadingDot);
      setCookie(SHOPIFY_S, '', 0, domainWithLeadingDot);
    }
  }, [
    coreCookiesReady,
    hasUserConsent,
    domain,
    checkoutDomain,
    ignoreDeprecatedCookies,
  ]);

  return coreCookiesReady;
}

function setCookie(
  name: string,
  value: string,
  maxage: number,
  domain: string,
): void {
  document.cookie = stringify(name, value, {
    maxage,
    domain,
    samesite: 'Lax',
    path: '/',
  });
}

async function fetchTrackingValuesFromBrowser(
  storefrontAccessToken?: string,
  storefrontApiDomain = '',
): Promise<void> {
  // These values might come from server-timing or old cookies.
  // If consent cannot be initially assumed, these tokens
  // will be dropped in SFAPI and it will return a mock token
  // starting with '00000000-'.
  // However, if consent can be assumed initially, these tokens
  // will be used to create proper cookies and continue our flow.
  const {uniqueToken, visitToken} = getTrackingValues();

  const response = await fetch(
    // TODO: update this endpoint when it becomes stable
    `${storefrontApiDomain.replace(/\/+$/, '')}/api/unstable/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storefrontAccessToken && {
          'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        }),
        ...(visitToken || uniqueToken
          ? {
              [SHOPIFY_VISIT_TOKEN_HEADER]: visitToken,
              [SHOPIFY_UNIQUE_TOKEN_HEADER]: uniqueToken,
            }
          : undefined),
      },
      body: JSON.stringify({
        query:
          // TODO: update to a faster query when available
          'query ensureCookies { consentManagement { cookies(visitorConsent:{}) { cookieDomain } } }',
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch consent from browser: ${response.status} ${response.statusText}`,
    );
  }

  // Consume the body to complete the request and
  // ensure server-timing is available in performance API
  await response.json();

  // Ensure we cache the latest tracking values from resources timing
  getTrackingValues();
}

type CoreShopifyCookiesOptions = {
  storefrontAccessToken?: string;
  fetchTrackingValues?: boolean;
  checkoutDomain?: string;
};

function useCoreShopifyCookies({
  checkoutDomain,
  storefrontAccessToken,
  fetchTrackingValues = false,
}: CoreShopifyCookiesOptions) {
  const [cookiesReady, setCookiesReady] = useState(!fetchTrackingValues);
  const hasFetchedTrackingValues = useRef(false);

  useEffect(() => {
    if (!fetchTrackingValues) {
      // Backend did the work, or proxy is disabled.
      setCookiesReady(true);
      return;
    }

    // React runs effects twice in dev mode, avoid double fetching
    if (hasFetchedTrackingValues.current) return;
    hasFetchedTrackingValues.current = true;

    // Fetch consent from browser via proxy
    fetchTrackingValuesFromBrowser(storefrontAccessToken)
      .catch((error) =>
        checkoutDomain
          ? // Retry with checkout domain if available
            fetchTrackingValuesFromBrowser(
              storefrontAccessToken,
              checkoutDomain,
            )
          : Promise.reject(error),
      )
      .catch((error) => {
        console.warn(
          '[h2:warn:AnalyticsProvider] Failed to fetch consent from browser: ' +
            (error instanceof Error ? error.message : String(error)),
        );
      })
      .finally(() => {
        // Proceed even on errors, degraded tracking is better than no app
        setCookiesReady(true);
      });
  }, [checkoutDomain, fetchTrackingValues, storefrontAccessToken]);

  return cookiesReady;
}
