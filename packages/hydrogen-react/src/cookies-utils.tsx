import {parse} from 'worktop/cookie';
import {ShopifyCookies} from './analytics-types.js';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';

const tokenHash = 'xxxx-4xxx-xxxx-xxxxxxxxxxxx';

// Example good cookie
// fc0a4fb1-A706-49FD-89B9-EEB3C87891A8
// 8-4-4-4-12 = 32 chars
// Example bad cookies
// b73cdfc-2032-4B68-8F29-C88B183DD930
// 7-4-4-4-12 = 31
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
  return output.padStart(8, '0').slice(0, 8);
}

export function getShopifyCookies(cookies: string): ShopifyCookies {
  const cookieData = parse(cookies);
  return {
    [SHOPIFY_Y]: cookieData[SHOPIFY_Y] || '',
    [SHOPIFY_S]: cookieData[SHOPIFY_S] || '',
  };
}
