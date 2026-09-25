import {useEffect, useRef, useState} from 'react';
// @ts-ignore - worktop/cookie types not properly exported
import {stringify} from 'worktop/cookie';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';
import {
  getTrackingValues,
  storeTrackingValues,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
  type ConsentFetchResult,
  type ConsentResponseValues,
} from './tracking-utils.js';

// Marks the same-origin consent request: the backend includes the tracking
// values in the response body only for requests carrying this header. A
// custom header on the cross-origin checkout retry would fail its CORS
// preflight, so it is never sent there.
// NOTE: packages/hydrogen/src/constants.ts defines the same header name
// (STOREFRONT_CONSENT_MANAGEMENT_HEADER) for the server-side proxy
// forwarding; keep the two in sync.
const CONSENT_MANAGEMENT_MARKER_HEADER =
  'Shopify-Storefront-Consent-Management';

type UseShopifyCookiesOptions = CoreShopifyCookiesOptions & {
  /**
   * If set to `false`, deprecated Shopify cookies will be removed.
   * If set to `true`, deprecated Shopify cookies are left untouched:
   * they are no longer created or refreshed.
   * Defaults to false.
   **/
  hasUserConsent?: boolean;
  /**
   * The domain scope used to remove the deprecated shopify_y and shopify_s
   * cookies. Defaults to empty string.
   **/
  domain?: string;
  /**
   * The checkout domain of the shop. Defaults to empty string. If set, the
   * removal domain is scoped to the common domain with the checkout domain.
   */
  checkoutDomain?: string;
  /**
   * If set to `true`, it skips removing the deprecated shopify_y and shopify_s
   * cookies.
   */
  ignoreDeprecatedCookies?: boolean;
  /**
   * A component-scoped ref that receives the consent fetch result: the
   * response body values (including the `null` no-consent signal) or a
   * failure when no response could be obtained. Used by Hydrogen's built-in
   * analytics wiring (`useCustomerPrivacy`) to publish and act on the result
   * within its component tree; not needed when calling this hook directly.
   */
  consentResultRef?: {current: ConsentFetchResult | null};
};

/**
 * Manages the deprecated `shopify_y` and `shopify_s` cookies based on user
 * consent for backward compatibility support. These cookies are never created
 * or refreshed anymore: tracking values are read from the Customer Privacy
 * API instead. When consent is not granted, any deprecated cookies found in
 * the browser are removed.
 *
 * If `fetchTrackingValues` is true, it sends the consent request to the
 * Storefront API proxy. The response refreshes the http-only analytics and
 * marketing cookies, and its tracking values are cached for later reads.
 * Generally speaking, this should only be needed if you're not using
 * Hydrogen's built-in analytics components and hooks that already handle
 * this automatically. For example, set it to `true` if you are using
 * `hydrogen-react` only with a different framework and still need the
 * consent request to run from the browser.
 *
 * @returns `true` when the consent request has settled and cookies are ready.
 * @publicDocs
 */
export function useShopifyCookies(options?: UseShopifyCookiesOptions): boolean {
  const {
    hasUserConsent,
    domain = '',
    checkoutDomain = '',
    storefrontAccessToken,
    fetchTrackingValues,
    ignoreDeprecatedCookies = false,
    consentResultRef,
  } = options || {};

  const coreCookiesReady = useCoreShopifyCookies({
    storefrontAccessToken,
    fetchTrackingValues,
    checkoutDomain,
    consentResultRef,
  });

  useEffect(() => {
    if (ignoreDeprecatedCookies || !coreCookiesReady) return;

    if (hasUserConsent) {
      // Deprecated cookies are no longer written. Existing ones are removed
      // client-side once their replacement values are in place through the
      // Customer Privacy API. Setups without that API (hydrogen-react only)
      // have no deletion, so the cookies simply age out.
      return;
    }

    /**
     * Removing cookies with a domain
     *
     * If no domain is provided, the cookie will be removed for the current
     * host. For Shopify, we need to ensure this domain is set with a leading
     * dot to cover the domain scope older storefronts may have used.
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

    // Deprecated cookies were written with a leading dot domain
    const domainWithLeadingDot = currentDomain
      ? /^\./.test(currentDomain)
        ? currentDomain
        : `.${currentDomain}`
      : '';

    // Remove user and session cookies by expiring them immediately
    setCookie(SHOPIFY_Y, '', 0, domainWithLeadingDot);
    setCookie(SHOPIFY_S, '', 0, domainWithLeadingDot);
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
): Promise<ConsentResponseValues> {
  // These values might come from the Customer Privacy API, the last
  // consentManagement response or old cookies. On the first load after
  // upgrading, that means the legacy cookie values, so the session migrates.
  // No fallback tokens are ever generated for this read.
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
        // The marker header goes on the same-origin request only, where the
        // Hydrogen server proxy can act on it.
        ...(storefrontApiDomain
          ? undefined
          : {[CONSENT_MANAGEMENT_MARKER_HEADER]: '1'}),
        ...(visitToken || uniqueToken
          ? {
              [SHOPIFY_VISIT_TOKEN_HEADER]: visitToken,
              [SHOPIFY_UNIQUE_TOKEN_HEADER]: uniqueToken,
            }
          : undefined),
      },
      body: JSON.stringify({
        query:
          // The response body is the only channel for tracking values.
          // The empty `visitorConsent` refreshes cookies without changing
          // the stored consent.
          'query ensureCookies { consentManagement { cookies(visitorConsent:{}) { trackingConsentCookie cookieDomain shopifyUnique shopifyVisit } } }',
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch consent from browser: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as {
    data?: {
      consentManagement?: {
        cookies?: {
          trackingConsentCookie?: string | null;
          shopifyUnique?: string | null;
          shopifyVisit?: string | null;
        };
      };
    };
  };

  const cookies = body.data?.consentManagement?.cookies;
  const values: ConsentResponseValues = {
    // Null (or missing) values are the backend's no-consent signal:
    uniqueToken: cookies?.shopifyUnique ?? null,
    visitToken: cookies?.shopifyVisit ?? null,
    consent: cookies?.trackingConsentCookie ?? null,
  };

  if (cookies) {
    // Null values drop any previously cached values so stale tokens are
    // never reused.
    storeTrackingValues(values);
  }

  return values;
}

type CoreShopifyCookiesOptions = {
  storefrontAccessToken?: string;
  fetchTrackingValues?: boolean;
  checkoutDomain?: string;
  consentResultRef?: {current: ConsentFetchResult | null};
};

/**
 * Gets http-only cookies from Storefront API via same-origin fetch request.
 * Falls back to checkout domain if provided to at least obtain the tracking
 * values from the consentManagement response body.
 */
function useCoreShopifyCookies({
  checkoutDomain,
  storefrontAccessToken,
  fetchTrackingValues = false,
  consentResultRef,
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

    const fetchConsentValues = async () => {
      try {
        return await fetchTrackingValuesFromBrowser(storefrontAccessToken);
      } catch (sameOriginError) {
        if (!checkoutDomain) throw sameOriginError;
        // Retry with checkout domain if the same-origin proxy failed.
        return fetchTrackingValuesFromBrowser(
          storefrontAccessToken,
          checkoutDomain,
        );
      }
    };

    // Report the outcome on the component-scoped ref when one was provided:
    const reportConsentResult = (result: ConsentFetchResult) => {
      if (consentResultRef) consentResultRef.current = result;
    };

    fetchConsentValues()
      .then((values) => {
        reportConsentResult({status: 'succeeded', values});
      })
      .catch((error) => {
        reportConsentResult({status: 'failed'});
        console.warn(
          '[h2:warn:useShopifyCookies] Failed to fetch tracking values from browser: ' +
            (error instanceof Error ? error.message : String(error)),
        );
      })
      .finally(() => {
        // Proceed even on errors, degraded tracking is better than no app
        setCookiesReady(true);
      });
  }, [
    checkoutDomain,
    fetchTrackingValues,
    storefrontAccessToken,
    consentResultRef,
  ]);

  return cookiesReady;
}
