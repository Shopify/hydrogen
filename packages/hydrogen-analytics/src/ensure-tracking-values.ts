/**
 * Browser-side SFAPI fetch to ensure tracking values (http-only cookies and
 * Server-Timing headers) are set even when the initial server response was
 * served from cache (where Server-Timing headers are absent).
 *
 * The old system (useShopifyCookies.tsx) made this request automatically.
 * This module ports that behavior as a framework-agnostic function.
 */

import {getTrackingValues} from './utils/tracking-values';

const SHOPIFY_VISIT_TOKEN_HEADER = 'X-Shopify-VisitToken';
const SHOPIFY_UNIQUE_TOKEN_HEADER = 'X-Shopify-UniqueToken';

const CONSENT_MANAGEMENT_QUERY =
  'query ensureCookies { consentManagement { cookies(visitorConsent:{}) { cookieDomain } } }';

async function fetchFromEndpoint(
  storefrontAccessToken: string,
  apiDomain: string,
): Promise<void> {
  const {uniqueToken, visitToken} = getTrackingValues();

  const tokenHeaders =
    visitToken || uniqueToken
      ? {
          [SHOPIFY_VISIT_TOKEN_HEADER]: visitToken || '',
          [SHOPIFY_UNIQUE_TOKEN_HEADER]: uniqueToken || '',
        }
      : {};

  const response = await fetch(
    `${apiDomain.replace(/\/+$/, '')}/api/unstable/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storefrontAccessToken && {
          'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        }),
        ...tokenHeaders,
      },
      body: JSON.stringify({query: CONSENT_MANAGEMENT_QUERY}),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch consent from browser: ${response.status} ${response.statusText}`,
    );
  }

  // Consume body to complete the request, then re-read tracking values
  // from the Performance API (the response's Server-Timing headers are
  // now available as resource timing entries).
  await response.json();
  getTrackingValues();
}

/**
 * Fetches tracking values from the SFAPI proxy when the server didn't
 * include them in the initial response (e.g., cached subrequests).
 *
 * Tries same-origin first, falls back to checkoutDomain.
 */
export async function ensureTrackingValues(
  storefrontAccessToken: string,
  checkoutDomain: string,
): Promise<void> {
  try {
    // Same-origin request (goes through SFAPI proxy)
    await fetchFromEndpoint(storefrontAccessToken, '');
  } catch (sameOriginError) {
    if (checkoutDomain) {
      try {
        // Fallback: direct request to checkout domain
        await fetchFromEndpoint(
          storefrontAccessToken,
          `https://${checkoutDomain}`,
        );
      } catch (fallbackError) {
        console.warn(
          '[h2:warn:Analytics] Failed to fetch tracking values from browser:',
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
        );
      }
    } else {
      console.warn(
        '[h2:warn:Analytics] Failed to fetch tracking values from browser:',
        sameOriginError instanceof Error
          ? sameOriginError.message
          : String(sameOriginError),
      );
    }
  }
}