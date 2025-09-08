import {useEffect} from 'react';

type UseShopifyCookiesOptions = {
  /**
   * @deprecated This parameter no longer has any effect. Cookie writing from frontend is disabled.
   * @see https://shopify.dev/changelog/shopifyy-and-shopifys-cookies-will-no-longer-be-set
   **/
  hasUserConsent?: boolean;
  /**
   * @deprecated This parameter no longer has any effect. Cookie writing from frontend is disabled.
   **/
  domain?: string;
  /**
   * @deprecated This parameter no longer has any effect. Cookie writing from frontend is disabled.
   */
  checkoutDomain?: string;
};

/**
 * @deprecated This hook is deprecated and non-functional due to Shopify's
 * cookie migration. Frontend cookie writing has been disabled to maintain
 * analytics data integrity and prevent tracking inconsistencies.
 *
 * **Migration Guide:**
 * - For reading cookies: Use `getShopifyCookies()` which handles Server-Timing headers
 * - For setting cookies: Implement server-side using `createAnalyticsCookieHeaders()`
 * - For Server-Timing: Use `createAnalyticsServerTimingHeader()` in your server response
 *
 * **Why this was deprecated:**
 * - Shopify analytics cookies are becoming HttpOnly for security
 * - Frontend cookie manipulation caused tracking inconsistencies
 * - Server-side is now the single source of truth for analytics
 *
 * This hook now only logs a deprecation warning and will be removed in a future version.
 *
 * @param options - Deprecated options that no longer have any effect
 *
 * @see https://shopify.dev/changelog/shopifyy-and-shopifys-cookies-will-no-longer-be-set
 * @see getShopifyCookies for reading cookie values
 * @see createAnalyticsCookieHeaders for server-side cookie creation
 */
export function useShopifyCookies(options?: UseShopifyCookiesOptions): void {
  useEffect(() => {
    if (__HYDROGEN_DEV__ && typeof window !== 'undefined') {
      console.warn(
        '[Hydrogen] useShopifyCookies is deprecated and no longer functional.\n' +
          'Frontend cookie writing has been disabled to prevent tracking inconsistencies.\n' +
          '_shopify_y and _shopify_s cookies are now managed server-side only.\n' +
          'To read these values, use getShopifyCookies() which automatically reads from Server-Timing headers.\n' +
          'This hook will be removed in a future version.\n' +
          'See: https://shopify.dev/changelog/shopifyy-and-shopifys-cookies-will-no-longer-be-set',
      );
    }
    // Cookie writing has been intentionally disabled.
    // The backend is now the single source of truth for these cookies.
    // Cookies are readable via Server-Timing headers using getShopifyCookies()
  }, []);
}
