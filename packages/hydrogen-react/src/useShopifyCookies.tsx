import {useEffect} from 'react';
import {stringify} from 'worktop/cookie';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';
import {buildUUID, getShopifyCookies} from './cookies-utils.js';

const longTermLength = 60 * 60 * 24 * 360 * 1; // ~1 year expiry
const shortTermLength = 60 * 30; // 30 mins

type UseShopifyCookiesOptions = {
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
};

export function useShopifyCookies(options?: UseShopifyCookiesOptions): void {
  const {hasUserConsent = false, domain = ''} = options || {};
  useEffect(() => {
    const cookies = getShopifyCookies(document.cookie);

    // Shopify checkout only consumes cookies set with leading dot domain
    const domainWithLeadingDot = domain ? (/^\./.test(domain) ? domain : `.${domain}`) : '';

    /**
     * Set user and session cookies and refresh the expiry time
     */
    if (hasUserConsent) {
      setCookie(
        SHOPIFY_Y,
        cookies[SHOPIFY_Y] || buildUUID(),
        longTermLength,
        domainWithLeadingDot,
      );
      setCookie(
        SHOPIFY_S,
        cookies[SHOPIFY_S] || buildUUID(),
        shortTermLength,
        domainWithLeadingDot,
      );
    } else {
      setCookie(SHOPIFY_Y, '', 0, domainWithLeadingDot);
      setCookie(SHOPIFY_S, '', 0, domainWithLeadingDot);
    }
  }, [options, hasUserConsent, domain]);
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
