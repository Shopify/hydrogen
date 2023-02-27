import {parse} from 'worktop/cookie';
import {ShopifyCookies} from './analytics-types.js';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';

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

  return output.padStart(8 - output.length, '0');
}

export function getShopifyCookies(cookies: string): ShopifyCookies {
  const cookieData = parse(cookies);
  return {
    [SHOPIFY_Y]: cookieData[SHOPIFY_Y] || '',
    [SHOPIFY_S]: cookieData[SHOPIFY_S] || '',
  };
}
