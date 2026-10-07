const COOKIE_NAME = "cart";
const MAX_AGE_IN_SECONDS = 1209600; // 14 days
const CART_GID_PREFIX = "gid://shopify/Cart/";

type CartCookieSource = Request | { cookie?: string };

export function normalizeCartId(cartId: string | null | undefined): string | null {
  if (!cartId) return null;
  return cartId.startsWith(CART_GID_PREFIX) ? cartId : CART_GID_PREFIX + cartId;
}

export function getCartIdFromCookie(input: CartCookieSource): string | null {
  const header = input instanceof Request ? input.headers.get("cookie") : input.cookie;
  if (!header) return null;

  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  if (!match || !match[1]) return null;

  const token = decodeURIComponent(match[1]);
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
 * @returns The header value that sets the cart cookie.
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
