/**
 * Inlined from @shopify/hydrogen-react/cookies-utils.
 * UUID generation for Monorail event IDs and tracking tokens.
 */

const TOKEN_HASH = 'xxxx-4xxx-xxxx-xxxxxxxxxxxx';

export function buildUUID(): string {
  let hash = '';

  try {
    const crypto: Crypto = window.crypto;
    const randomValuesArray = new Uint16Array(31);
    crypto.getRandomValues(randomValuesArray);

    let i = 0;
    hash = TOKEN_HASH.replace(/[x]/g, (c: string): string => {
      const r = randomValuesArray[i] % 16;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      i++;
      return v.toString(16);
    }).toUpperCase();
  } catch {
    hash = TOKEN_HASH.replace(/[x]/g, (c: string): string => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }).toUpperCase();
  }

  return `${hexTime()}-${hash}`;
}

function hexTime(): string {
  let dateNumber = new Date().getTime() >>> 0;
  let perfNumber = 0;

  try {
    perfNumber = performance.now() >>> 0;
  } catch {
    perfNumber = 0;
  }

  return Math.abs(dateNumber + perfNumber)
    .toString(16)
    .toLowerCase()
    .padStart(8, '0');
}
