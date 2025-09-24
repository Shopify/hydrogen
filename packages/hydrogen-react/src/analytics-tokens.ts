/**
 * Analytics token utilities for handling Shopify analytics cookies
 * and Server-Timing headers for HttpOnly cookie support
 */

/**
 * Source of analytics tokens
 */
export type AnalyticsTokenSource =
  | 'existing-cookies'
  | 'relay-only'
  | 'server-timing'
  | 'storefront-api';

/**
 * Analytics tokens structure for visitor and session tracking
 */
export interface AnalyticsTokens {
  /** The visitor token (_shopify_y cookie value) */
  visitorToken: string;
  /** The session token (_shopify_s cookie value) */
  sessionToken: string;
  /** The consent cookie value if present */
  consentCookie?: string;
  /** Landing page cookie value */
  landingPageCookie?: string;
  /** Original referrer cookie value */
  origReferrerCookie?: string;
  /** Cookie domain from consent API */
  cookieDomain?: string;
  /** Source of the tokens */
  source: AnalyticsTokenSource;
}

/**
 * Cookie options for Set-Cookie headers
 */
export interface AnalyticsCookieOptions {
  /** Cookie domain */
  domain?: string;
  /** Cookie path (defaults to '/') */
  path?: string;
  /** SameSite attribute */
  sameSite?: 'Lax' | 'Strict' | 'None';
  /** Secure flag */
  secure?: boolean;
  /** HttpOnly flag */
  httpOnly?: boolean;
  /** Request URL for auto-detection of localhost */
  requestUrl?: string;
}

/**
 * Creates a Server-Timing header value from analytics tokens to enable frontend
 * JavaScript access to analytics data when cookies are HttpOnly.
 *
 * This function is critical for maintaining analytics functionality when Shopify's
 * _shopify_y and _shopify_s cookies are HttpOnly. It exposes the analytics tokens
 * through the Server-Timing API, which remains accessible to frontend JavaScript.
 *
 * @param tokens - The analytics tokens containing visitor, session, and consent data
 * @returns A formatted Server-Timing header value string, or empty string if no tokens
 *
 * @example
 * ```typescript
 * const tokens = {
 *   visitorToken: 'abc-123',
 *   sessionToken: 'def-456',
 *   consentCookie: '3.AMPS...',
 *   source: 'existing-cookies'
 * };
 * const headerValue = createAnalyticsServerTimingHeader(tokens);
 * // Returns: '_y;desc="abc-123", _s;desc="def-456", _cmp;desc="3.AMPS..."'
 * responseHeaders.set('Server-Timing', headerValue);
 * ```
 *
 * @remarks
 * The Server-Timing entries use the following naming convention:
 * - `_y`: Visitor token (_shopify_y cookie equivalent)
 * - `_s`: Session token (_shopify_s cookie equivalent)
 * - `_cmp`: Consent/compliance tracking cookie
 *
 * @see https://shopify.dev/changelog/shopifyy-and-shopifys-cookies-will-no-longer-be-set
 */
export function createAnalyticsServerTimingHeader(
  tokens: AnalyticsTokens,
): string {
  const parts: string[] = [];

  if (tokens.visitorToken) {
    parts.push(`_y;desc="${tokens.visitorToken}"`);
  }

  if (tokens.sessionToken) {
    parts.push(`_s;desc="${tokens.sessionToken}"`);
  }

  // Include consent/compliance tracking to match Shopify platform behavior
  if (tokens.consentCookie) {
    parts.push(`_cmp;desc="${tokens.consentCookie}"`);
  }

  return parts.join(', ');
}

/**
 * Creates properly formatted Set-Cookie headers for Shopify analytics cookies,
 * handling domain configuration, security settings, and cookie migration support.
 *
 * This function manages the server-side cookie creation for Shopify's analytics system,
 * ensuring cookies are set with appropriate expiry times, security flags, and domain
 * configuration. It automatically detects localhost development environments and adjusts
 * settings accordingly.
 *
 * @param tokens - Analytics tokens including visitor, session, consent, and attribution data
 * @param options - Optional cookie configuration for domain, path, and security settings
 * @returns Array of formatted Set-Cookie header strings ready to be sent in HTTP response
 *
 * @example
 * ```typescript
 * const tokens = {
 *   visitorToken: 'abc-123',
 *   sessionToken: 'def-456',
 *   consentCookie: '3.AMPS...',
 *   landingPageCookie: '/products',
 *   origReferrerCookie: 'https://google.com',
 *   cookieDomain: '.myshopify.com',
 *   source: 'storefront-api'
 * };
 *
 * const cookies = createAnalyticsCookieHeaders(tokens, {
 *   requestUrl: request.url, // Auto-detects localhost
 *   secure: true,
 *   httpOnly: false // For client-side accessibility
 * });
 *
 * cookies.forEach(cookie => {
 *   responseHeaders.append('Set-Cookie', cookie);
 * });
 * ```
 *
 * @remarks
 * Cookie lifetimes and behaviors:
 * - `_shopify_y` (visitor): 1 year expiry, tracks unique visitors
 * - `_shopify_s` (session): 30 minutes expiry, tracks active sessions
 * - `_tracking_consent`: 1 year expiry, NOT HttpOnly (requires client access)
 * - `_landing_page`: 1 year expiry, URL-encoded, tracks entry points
 * - `_orig_referrer`: 1 year expiry, URL-encoded, tracks traffic sources
 *
 * Localhost detection:
 * - Automatically removes Domain attribute for localhost/127.0.0.1
 * - Disables Secure flag for HTTP development
 * - Uses cookieDomain from API if available (preferred over manual config)
 *
 * @see https://shopify.dev/docs/api/hydrogen/utilities/createanalyticscookieheaders
 */
export function createAnalyticsCookieHeaders(
  tokens: AnalyticsTokens,
  options: AnalyticsCookieOptions = {},
): string[] {
  const headers: string[] = [];

  // Auto-detect localhost from request URL if provided
  // OR from the provided domain itself
  const isLocalhost = options.requestUrl
    ? options.requestUrl.includes('localhost') ||
      options.requestUrl.includes('127.0.0.1') ||
      options.requestUrl.startsWith('http://localhost') ||
      options.requestUrl.startsWith('http://127.0.0.1')
    : false;

  const {
    domain: providedDomain,
    path = '/',
    sameSite = 'Lax',
    secure: providedSecure,
    httpOnly = false, // Changed to false to match current Shopify behavior
  } = options;

  // Smart defaults for localhost development:
  // - No domain for localhost (cookies won't work with wrong domain)
  // - No secure flag for HTTP
  // When on localhost, always override domain and secure settings
  // Use cookieDomain from API if available (it knows the correct domain config)
  const domain = isLocalhost
    ? undefined
    : tokens.cookieDomain || providedDomain;
  const secure = isLocalhost
    ? false
    : providedSecure !== undefined
      ? providedSecure
      : true;

  // Base options for long-lived cookies
  const baseOptions = [
    `Path=${path}`,
    'Max-Age=31536000', // 1 year
    `SameSite=${sameSite}`,
  ];

  if (secure) baseOptions.push('Secure');
  if (httpOnly) baseOptions.push('HttpOnly');
  if (domain) baseOptions.push(`Domain=${domain}`);

  // Visitor token cookie (1 year)
  if (tokens.visitorToken) {
    headers.push(
      `_shopify_y=${tokens.visitorToken}; ${baseOptions.join('; ')}`,
    );
  }

  // Session token cookie (30 minutes)
  if (tokens.sessionToken) {
    const sessionOptions = [
      `Path=${path}`,
      'Max-Age=1800', // 30 minutes
      `SameSite=${sameSite}`,
    ];
    if (secure) sessionOptions.push('Secure');
    if (httpOnly) sessionOptions.push('HttpOnly');
    if (domain) sessionOptions.push(`Domain=${domain}`);

    headers.push(
      `_shopify_s=${tokens.sessionToken}; ${sessionOptions.join('; ')}`,
    );
  }

  // Consent cookie (not HttpOnly - needs client access)
  if (tokens.consentCookie) {
    const consentOptions = [
      `Path=${path}`,
      'Max-Age=31536000', // 1 year
      `SameSite=${sameSite}`,
    ];
    if (secure) consentOptions.push('Secure');
    // Note: NOT HttpOnly - consent cookie needs client-side access
    if (domain) consentOptions.push(`Domain=${domain}`);

    headers.push(
      `_tracking_consent=${tokens.consentCookie}; ${consentOptions.join('; ')}`,
    );
  }

  // Landing page cookie (URL encoded)
  if (tokens.landingPageCookie) {
    const landingOptions = [
      `Path=${path}`,
      'Max-Age=31536000', // 1 year
      `SameSite=${sameSite}`,
    ];
    if (secure) landingOptions.push('Secure');
    if (domain) landingOptions.push(`Domain=${domain}`);

    headers.push(
      `_landing_page=${encodeURIComponent(tokens.landingPageCookie)}; ${landingOptions.join('; ')}`,
    );
  }

  // Original referrer cookie (URL encoded)
  if (tokens.origReferrerCookie) {
    const referrerOptions = [
      `Path=${path}`,
      'Max-Age=31536000', // 1 year
      `SameSite=${sameSite}`,
    ];
    if (secure) referrerOptions.push('Secure');
    if (domain) referrerOptions.push(`Domain=${domain}`);

    headers.push(
      `_orig_referrer=${encodeURIComponent(tokens.origReferrerCookie)}; ${referrerOptions.join('; ')}`,
    );
  }

  return headers;
}
