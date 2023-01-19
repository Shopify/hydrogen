import {useEffect} from 'react';
import {stringify} from 'worktop/cookie';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';
import {buildUUID, getShopifyCookies} from './cookies-utils.js';

const longTermLength = 60 * 60 * 24 * 360 * 1; // ~1 year expiry
const shortTermLength = 60 * 30; // 30 mins

/**
 * Set user and session cookies and refresh the expiry time
 * @param hasUserConsent - Defaults to false. If hasUserConsent is true, we can set Shopify unique user
 * token cookie from expiry of 30 mins to 1 year
 * @param domain - The domain scope of the cookie
 * @example
 * ```tsx
 * import {useShopifyCookies} from '@shopify/storefront-kit-react';
 *
 * useShopifyCookies(true, 'my-shop.com')
 * ```
 */
export function useShopifyCookies(hasUserConsent = false, domain = ''): void {
  useEffect(() => {
    const cookies = getShopifyCookies(document.cookie);

    /**
     * Set user and session cookies and refresh the expiry time
     */
    setCookie(
      SHOPIFY_Y,
      cookies[SHOPIFY_Y] || buildUUID(),
      hasUserConsent ? longTermLength : shortTermLength,
      domain
    );
    setCookie(
      SHOPIFY_S,
      cookies[SHOPIFY_S] || buildUUID(),
      shortTermLength,
      domain
    );
  });
}

function setCookie(
  name: string,
  value: string,
  maxage: number,
  domain: string
): void {
  document.cookie = stringify(name, value, {
    maxage,
    domain,
    samesite: 'Lax',
    path: '/',
  });
}
