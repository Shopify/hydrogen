// @ts-ignore - worktop/cookie types not properly exported
import {parse} from 'worktop/cookie';
import {ShopifyCookies} from './analytics-types.js';
import {SHOPIFY_Y, SHOPIFY_S} from './cart-constants.js';

const tokenHash = 'xxxx-4xxx-xxxx-xxxxxxxxxxxx';

/**
 * Generates a unique UUID for analytics tracking purposes.
 * Uses crypto.randomUUID when available, with a fallback implementation
 * for environments that don't support it.
 *
 * @returns A UUID string in the format: `{timestamp}-{random-hash}`
 *
 * @example
 * ```tsx
 * const uuid = buildUUID();
 * // Returns: "01234567-XXXX-4XXX-XXXX-XXXXXXXXXXXX"
 * ```
 *
 * @deprecated Frontend UUID generation is discouraged. Tokens should be
 * backend-approved to maintain trust boundaries. Use server-side token
 * generation or relay existing tokens instead.
 */
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

/**
 * Generates an 8-character hexadecimal timestamp combining current time and performance timing.
 * Used as part of UUID generation for analytics tokens.
 *
 * @returns An 8-character hexadecimal string representing current timestamp
 *
 * @example
 * ```tsx
 * const timestamp = hexTime();
 * // Returns: "0abc1234" (8 hex characters)
 * ```
 *
 * @internal
 */
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
 * Retrieves Shopify analytics cookies with automatic migration support for
 * HttpOnly cookie transitions. Implements a dual-mode access pattern
 * that ensures analytics continuity across cookie access changes.
 *
 * This function is the primary interface for reading analytics cookies in Hydrogen,
 * automatically detecting and using the appropriate access method based on availability.
 * It ensures your analytics implementation continues working seamlessly before, during,
 * and after the cookie migration.
 *
 * @param cookies - The cookie string from document.cookie (client) or request headers (server)
 * @returns Object containing _shopify_y (visitor token) and _shopify_s (session token)
 *
 * @example
 * ```tsx
 * // Client-side usage in React component
 * import { getShopifyCookies } from '@shopify/hydrogen-react';
 *
 * function AnalyticsComponent() {
 *   const cookies = getShopifyCookies(document.cookie);
 *   console.log('Visitor ID:', cookies._shopify_y);
 *   console.log('Session ID:', cookies._shopify_s);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Server-side usage in React Router loader
 * export async function loader({ request }: LoaderArgs) {
 *   const cookieHeader = request.headers.get('Cookie') || '';
 *   const cookies = getShopifyCookies(cookieHeader);
 *   // Use for server-side analytics
 * }
 * ```
 *
 * @remarks
 * Access priority (automatically determined):
 * 1. **Server-Timing headers**: Reads from performance API
 *    - Backend exposes tokens via Server-Timing: `_y`, `_s` entries
 *    - Works even when cookies are HttpOnly
 * 2. **Direct cookie access**: Traditional cookie reading
 *    - Falls back when Server-Timing unavailable
 *    - Maintains backward compatibility
 *
 * The function handles:
 * - Browser environments with/without Server-Timing API
 * - Server-side Node.js environments
 * - Partial data availability (uses available sources)
 * - API errors and missing data gracefully
 *
 * @see https://shopify.dev/docs/api/hydrogen/utilities/getshopifycookies
 */
export function getShopifyCookies(cookies: string): ShopifyCookies {
  let shopifyY = '';
  let shopifyS = '';

  // Shopify is migrating these cookies to be readable only server-side.
  // The server now provides them via Server-Timing headers for frontend access.
  if (
    typeof window !== 'undefined' &&
    typeof window.performance !== 'undefined'
  ) {
    try {
      const navigationEntries = performance.getEntriesByType('navigation');

      if (navigationEntries && navigationEntries.length > 0) {
        const navEntry = navigationEntries[0] as PerformanceNavigationTiming;

        // Server-Timing API provides cookies from the backend in a secure way
        if (navEntry.serverTiming && Array.isArray(navEntry.serverTiming)) {
          const yTiming = navEntry.serverTiming.find(
            (timing: PerformanceServerTiming) => timing.name === '_y',
          );
          const sTiming = navEntry.serverTiming.find(
            (timing: PerformanceServerTiming) => timing.name === '_s',
          );

          if (yTiming?.description) {
            shopifyY = yTiming.description;
          }
          if (sTiming?.description) {
            shopifyS = sTiming.description;
          }
        }
      }
    } catch (error) {
      // Older browsers or API failures will use cookie fallback below
    }
  }

  // Only use cookie fallback on server-side or if Server-Timing didn't provide values
  // Note: HttpOnly cookies set by server won't be readable here on client-side
  if (!shopifyY || !shopifyS) {
    const cookieData = parse(cookies);
    shopifyY = shopifyY || cookieData[SHOPIFY_Y] || '';
    shopifyS = shopifyS || cookieData[SHOPIFY_S] || '';
  }

  return {
    [SHOPIFY_Y]: shopifyY,
    [SHOPIFY_S]: shopifyS,
  };
}
