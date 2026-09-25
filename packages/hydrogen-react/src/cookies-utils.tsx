import {ShopifyCookies} from './analytics-types.js';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';
import {getTrackingValues} from './tracking-utils.js';
// @ts-ignore - worktop/cookie types not properly exported
import {stringify} from 'worktop/cookie';

const tokenHash = 'xxxx-4xxx-xxxx-xxxxxxxxxxxx';

export function buildUUID(): string {
  let hash = '';

  try {
    const crypto: Crypto = window.crypto;
    const randomValuesArray = new Uint16Array(31);
    crypto.getRandomValues(randomValuesArray);

    // Generate a strong UUID
    let i = 0;
    hash = tokenHash
      .replace(/[x]/g, (c: string): string => {
        const r = randomValuesArray[i] % 16;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        i++;
        return v.toString(16);
      })
      .toUpperCase();
  } catch (err) {
    // crypto not available, generate weak UUID
    hash = tokenHash
      .replace(/[x]/g, (c: string): string => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
      .toUpperCase();
  }

  return `${hexTime()}-${hash}`;
}

export function hexTime(): string {
  // 32 bit representations of new Date().getTime() and performance.now()
  let dateNumber = 0;
  let perfNumber = 0;

  // Result of zero-fill right shift is always positive
  dateNumber = new Date().getTime() >>> 0;

  try {
    perfNumber = performance.now() >>> 0;
  } catch (err) {
    perfNumber = 0;
  }

  const output = Math.abs(dateNumber + perfNumber)
    .toString(16)
    .toLowerCase();

  // Ensure the output is exactly 8 characters
  return output.padStart(8, '0');
}

/**
 * Gets the values of _shopify_y and _shopify_s cookies from the provided cookie string. If the Shopify cookies doesn't exist, this method will return an empty string for each missing cookie.
 * @deprecated Use getTrackingValues instead.
 * @publicDocs
 */
export function getShopifyCookies(cookies: string): ShopifyCookies {
  // @ts-expect-error - Undeclared argument type
  const trackingValues = getTrackingValues(cookies);

  return {
    [SHOPIFY_Y]: trackingValues.uniqueToken,
    [SHOPIFY_S]: trackingValues.visitToken,
  };
}

export type ExpireDeprecatedCookiesOptions = {
  /**
   * The domain scope used to expire the deprecated shopify_y and shopify_s
   * cookies. Defaults to the current host.
   */
  domain?: string;
  /**
   * The checkout domain of the shop. If set, the expiry domain is scoped to
   * the domain shared with the checkout domain.
   */
  checkoutDomain?: string;
};

/**
 * Expires the deprecated `_shopify_y` and `_shopify_s` cookies by writing
 * them with an empty value and `max-age=0`. The cookies are never created or
 * refreshed anymore: tracking values are read from the Customer Privacy API
 * instead, so this only removes leftovers from older storefront versions.
 *
 * Removing cookies with a domain: if no `domain` is provided, the current
 * host is used. Deprecated cookies were written with a leading-dot domain to
 * cover the domain scope older storefronts may have used, so the same
 * leading-dot domain is used to expire them. When `checkoutDomain` is set,
 * the domain is scoped to the parts shared with the checkout domain, so the
 * expiry covers the shop domain without touching unrelated domains.
 * @publicDocs
 */
export function expireDeprecatedCookies(
  options: ExpireDeprecatedCookiesOptions = {},
): void {
  if (typeof document === 'undefined') return;

  const {domain = '', checkoutDomain = ''} = options;

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

  // A Domain attribute would not match a dev localhost host, so the expiry
  // must be host-only there.
  if (/^localhost/.test(currentDomain)) currentDomain = '';

  const domainWithLeadingDot = currentDomain
    ? /^\./.test(currentDomain)
      ? currentDomain
      : `.${currentDomain}`
    : '';

  setCookie(SHOPIFY_Y, '', 0, domainWithLeadingDot);
  setCookie(SHOPIFY_S, '', 0, domainWithLeadingDot);
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
