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
  /**
   * The checkout domain of the shop. Defaults to empty string. If set, the cookie domain will check if it can be set with the checkout domain.
   */
  checkoutDomain?: string;
};

export function useShopifyCookies(options?: UseShopifyCookiesOptions): void {
  const {
    hasUserConsent = false,
    domain = '',
    checkoutDomain = '',
  } = options || {};
  useEffect(() => {
    const cookies = getShopifyCookies(document.cookie);

    /**
     * Setting cookie with domain
     *
     * If no domain is provided, the cookie will be set for the current host.
     * For Shopify, we need to ensure this domain is set with a leading dot.
     */

    // Use override domain or current host
    let currentDomain = domain || window.document.location.host;

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
  }, [options, hasUserConsent, domain, checkoutDomain]);
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
