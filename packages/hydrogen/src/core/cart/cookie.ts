import { parseCookieHeader } from "../utils/cookie-header";

const COOKIE_NAME = "cart";
const MAX_AGE_IN_SECONDS = 1209600; // 14 days
const CART_GID_PREFIX = "gid://shopify/Cart/";

const SELLER_COOKIE_PREFIX = "hydrogen-cart.";
const SELLER_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
const SELLER_COOKIE_VALUE_PATTERN = /^(\d{1,12})\|(.+)$/;
const MAX_SELLER_CARTS = 10;
const MAX_SELLER_COOKIE_VALUE_BYTES = 256;
const MAX_SELLER_COOKIE_BYTES = 2048;
const DEFAULT_SELLER_COOKIE_MAX_AGE = 1209600; // 14 days
const MAX_SELLER_COOKIE_MAX_AGE = 2592000; // 30 days

type CartCookieSource = Request | { cookie?: string };

/** A seller cart ID read from a `hydrogen-cart.<seller>` cookie. */
export type SellerCartCookie = {
  seller: string;
  cartId: string;
  /** When the cookie was last written, in seconds since the epoch. */
  writtenAt: number;
  /** The bytes that the cookie's `name=value` pair adds to the `Cookie` header. */
  bytes: number;
};

type SellerCookieOptions = {
  /** Adds `Secure`. Set it when the request URL is HTTPS. */
  secure: boolean;
};

type SellerCartCookieOptions = SellerCookieOptions & {
  /** When the seller cart expires. The cookie's `Max-Age` follows it. */
  expiresAt?: string;
  /** The write time in milliseconds since the epoch. Defaults to `Date.now()`. */
  now?: number;
};

export function normalizeCartId(cartId: string | null | undefined): string | null {
  if (!cartId) return null;
  return cartId.startsWith(CART_GID_PREFIX) ? cartId : CART_GID_PREFIX + cartId;
}

export function getCartIdFromCookie(input: CartCookieSource): string | null {
  const header = input instanceof Request ? input.headers.get("cookie") : input.cookie;
  if (!header) return null;

  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match || !match[1]) return null;

  let token: string;
  try {
    token = decodeURIComponent(match[1]);
  } catch {
    // Treat a malformed cookie value as a missing cart instead of failing the request.
    return null;
  }
  if (!token) return null;

  return normalizeCartId(token);
}

/**
 * Creates the `Set-Cookie` header value that stores the cart ID in the `cart` cookie.
 *
 * The cookie holds the cart token without the `gid://shopify/Cart/` prefix and expires
 * after 14 days. The cookie sets `Path=/` and `SameSite=Lax`, and leaves out `HttpOnly`
 * and `Secure`. Append the value to the response headers to keep the response's
 * other cookies.
 *
 * @param cartId The cart GID or cart token to store.
 * @returns The header value that sets the `cart` cookie.
 * @example
 * ```ts
 * const cookie = createCartCookie("gid://shopify/Cart/abc123");
 * // "cart=abc123; Path=/; SameSite=Lax; Max-Age=1209600"
 *
 * headers.append("Set-Cookie", cookie);
 * ```
 * @publicDocs
 */
export function createCartCookie(cartId: string): string {
  const token = cartId.startsWith(CART_GID_PREFIX) ? cartId.slice(CART_GID_PREFIX.length) : cartId;
  const encoded = encodeURIComponent(token);
  return `${COOKIE_NAME}=${encoded}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_IN_SECONDS}`;
}

export function createExpiredCartCookie(): string {
  return `${COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function isSellerHandle(value: string): boolean {
  return SELLER_HANDLE_PATTERN.test(value);
}

/**
 * Reads the seller carts within the caps, most recently written first (ties by handle): at most
 * 10 sellers and 2,048 bytes in total. Cookies with an invalid name, a value over 256 bytes, or a
 * malformed value are ignored.
 */
export function getSellerCartsFromCookie(input: CartCookieSource): SellerCartCookie[] {
  const kept: SellerCartCookie[] = [];
  let bytes = 0;
  for (const entry of readSellerCookies(input)) {
    if (kept.length === MAX_SELLER_CARTS || bytes + entry.bytes > MAX_SELLER_COOKIE_BYTES) break;
    kept.push(entry);
    bytes += entry.bytes;
  }
  return kept;
}

export function getSellerCartIdFromCookie(input: CartCookieSource, seller: string): string | null {
  return getSellerCartsFromCookie(input).find((entry) => entry.seller === seller)?.cartId ?? null;
}

export function createSellerCartCookie(
  seller: string,
  cartId: string,
  { expiresAt, secure, now = Date.now() }: SellerCartCookieOptions,
): string {
  const value = sellerCookieValue(cartId, now);
  const maxAge = sellerCookieMaxAge(expiresAt, now);
  return `${sellerCookieName(seller)}=${value}${sellerCookieAttributes(maxAge, secure)}`;
}

export function createExpiredSellerCartCookie(
  seller: string,
  { secure }: SellerCookieOptions,
): string {
  return `${sellerCookieName(seller)}=${sellerCookieAttributes(0, secure)}`;
}

/**
 * Returns the sellers whose cookies to expire so that writing `seller`'s cookie keeps every seller
 * cookie within the read caps. The least recently written cookies go first (ties by handle).
 */
export function planSellerCookieEvictions(
  input: CartCookieSource,
  seller: string,
  cartId: string,
  now: number = Date.now(),
): string[] {
  const newBytes = sellerCookieName(seller).length + 1 + sellerCookieValue(cartId, now).length;
  let bytes = newBytes;
  let count = 1;
  let full = false;
  const evicted: string[] = [];
  for (const entry of readSellerCookies(input)) {
    if (entry.seller === seller) continue;
    full ||= count === MAX_SELLER_CARTS || bytes + entry.bytes > MAX_SELLER_COOKIE_BYTES;
    if (full) {
      evicted.push(entry.seller);
      continue;
    }
    count += 1;
    bytes += entry.bytes;
  }
  return evicted;
}

function readSellerCookies(input: CartCookieSource): SellerCartCookie[] {
  const header = input instanceof Request ? input.headers.get("cookie") : input.cookie;
  const entries: SellerCartCookie[] = [];
  for (const [name, rawValue] of parseCookieHeader(header)) {
    const entry = parseSellerCookie(name, rawValue.trim());
    if (entry) entries.push(entry);
  }
  return entries.toSorted(
    (a, b) => b.writtenAt - a.writtenAt || (a.seller < b.seller ? -1 : a.seller > b.seller ? 1 : 0),
  );
}

function parseSellerCookie(name: string, value: string): SellerCartCookie | null {
  if (!name.startsWith(SELLER_COOKIE_PREFIX)) return null;
  const seller = name.slice(SELLER_COOKIE_PREFIX.length);
  if (!isSellerHandle(seller) || value.length > MAX_SELLER_COOKIE_VALUE_BYTES) return null;

  const match = SELLER_COOKIE_VALUE_PATTERN.exec(value);
  if (!match?.[1] || !match[2]) return null;
  let token: string;
  try {
    token = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  const cartId = normalizeCartId(token);
  if (!cartId) return null;
  return {
    seller,
    cartId,
    writtenAt: Number(match[1]),
    bytes: name.length + 1 + value.length,
  };
}

function sellerCookieName(seller: string): string {
  if (!isSellerHandle(seller)) throw new TypeError(`Invalid seller handle: ${seller}`);
  return SELLER_COOKIE_PREFIX + seller;
}

function sellerCookieValue(cartId: string, now: number): string {
  const token = cartId.startsWith(CART_GID_PREFIX) ? cartId.slice(CART_GID_PREFIX.length) : cartId;
  return `${Math.floor(now / 1000)}|${encodeURIComponent(token)}`;
}

function sellerCookieMaxAge(expiresAt: string | undefined, now: number): number {
  const expires = expiresAt === undefined ? Number.NaN : Date.parse(expiresAt);
  if (Number.isNaN(expires)) return DEFAULT_SELLER_COOKIE_MAX_AGE;
  const seconds = Math.ceil((expires - now) / 1000);
  return Math.min(Math.max(seconds, 0), MAX_SELLER_COOKIE_MAX_AGE);
}

function sellerCookieAttributes(maxAge: number, secure: boolean): string {
  return `; Path=/; SameSite=Lax; HttpOnly; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
