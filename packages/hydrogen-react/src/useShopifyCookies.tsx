import {useEffect, useRef, useState} from 'react';
import {
  getTrackingValues,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from './tracking-utils.js';

// Marks the same-origin consent request so the backend can identify
// headless consent-management traffic. A custom header on the cross-origin
// checkout retry would fail its CORS preflight, so it is never sent there.
// NOTE: packages/hydrogen/src/constants.ts defines the same header name
// (STOREFRONT_CONSENT_MANAGEMENT_HEADER) for the server-side proxy
// forwarding; keep the two in sync.
const CONSENT_MANAGEMENT_MARKER_HEADER =
  'Shopify-Storefront-Consent-Management';

type UseShopifyCookiesOptions = {
  storefrontAccessToken?: string;
  fetchTrackingValues?: boolean;
  /** @deprecated No longer used. The Customer Privacy API manages Shopify cookies. */
  hasUserConsent?: boolean;
  /** @deprecated No longer used. The Customer Privacy API manages cookie domains. */
  domain?: string;
  /** The checkout domain used if the same-origin consent request fails. */
  checkoutDomain?: string;
  /** @deprecated No longer used. The Customer Privacy API expires deprecated cookies. */
  ignoreDeprecatedCookies?: boolean;
};

/**
 * Optionally refreshes backend-managed cookies for standalone integrations.
 * The Customer Privacy API owns tracking values and legacy cookie expiration.
 *
 * If `fetchTrackingValues` is true, this sends a consent request through the
 * Storefront API proxy, retrying against `checkoutDomain` if provided. Hydrogen's
 * built-in analytics already delegates consent initialization to the Customer
 * Privacy API and does not use this hook.
 *
 * @returns `true` when the consent request has settled and cookies are ready.
 * @publicDocs
 */
export function useShopifyCookies(options?: UseShopifyCookiesOptions): boolean {
  const {
    checkoutDomain,
    storefrontAccessToken,
    fetchTrackingValues = false,
  } = options ?? {};
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

    fetchConsentValues()
      .catch((error) => {
        console.warn(
          '[h2:warn:useShopifyCookies] Failed to fetch tracking values from browser: ' +
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

async function fetchTrackingValuesFromBrowser(
  storefrontAccessToken?: string,
  storefrontApiDomain = '',
): Promise<void> {
  // Forward the current CTA tokens or legacy cookies to preserve the session.
  // CTA suppresses token generation while its async consent is loading.
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
}
