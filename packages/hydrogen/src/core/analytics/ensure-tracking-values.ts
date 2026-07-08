/**
 * Browser-side SFAPI fetch to ensure tracking values are available when the
 * app is configured with the same-origin SFAPI proxy.
 *
 * The old system (useShopifyCookies.tsx) made this request automatically.
 * This module ports that behavior as a framework-agnostic function.
 */

import { SHOPIFY_UNIQUE_TOKEN_HEADER, SHOPIFY_VISIT_TOKEN_HEADER } from "../headers";
import { getTrackingValues } from "./utils/tracking-values";

/** This query is only available on 'unstable', it is not part of the general schema */
const CONSENT_MANAGEMENT_QUERY = /* GraphQL */ `
  query ensureCookies {
    consentManagement {
      cookies(visitorConsent: {}) {
        cookieDomain
      }
    }
  }
`;

async function fetchFromEndpoint(
  apiDomain: string,
  publicStorefrontAccessToken?: string,
): Promise<void> {
  const { uniqueToken, visitToken } = getTrackingValues();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (publicStorefrontAccessToken) {
    headers["X-Shopify-Storefront-Access-Token"] = publicStorefrontAccessToken;
  }

  if (visitToken || uniqueToken) {
    headers[SHOPIFY_VISIT_TOKEN_HEADER] = visitToken || "";
    headers[SHOPIFY_UNIQUE_TOKEN_HEADER] = uniqueToken || "";
  }

  const response = await fetch(`${apiDomain.replace(/\/+$/, "")}/api/unstable/graphql.json`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: CONSENT_MANAGEMENT_QUERY }),
  });

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
 * Uses a same-origin request when consentDomain is the current host; otherwise
 * uses the configured consentDomain.
 */
export async function ensureTrackingValues(
  consentDomain?: string,
  publicStorefrontAccessToken?: string,
): Promise<void> {
  let consentOrigin = "";
  if (consentDomain) {
    const consentUrl = new URL(
      consentDomain.includes("://") ? consentDomain : `https://${consentDomain}`,
    );

    if (typeof window === "undefined" || consentUrl.host !== window.location.host) {
      consentOrigin = consentUrl.origin;
    }
  }

  try {
    await fetchFromEndpoint(consentOrigin, publicStorefrontAccessToken);
  } catch (error) {
    console.warn(
      "[h2:warn:Analytics] Failed to fetch tracking values from browser:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
