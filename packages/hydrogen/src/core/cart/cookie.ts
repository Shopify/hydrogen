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
 * Serializes a cart GID into a `Set-Cookie` header value.
 *
 * Strips the `gid://shopify/Cart/` prefix before encoding — the cookie stores
 * only the opaque suffix to keep the header compact. The cookie is set with
 * `Path=/; SameSite=Lax` and a 14-day `Max-Age`.
 *
 * @example
 * ```ts
 * const cookie = createCartCookie("gid://shopify/Cart/abc123");
 * // "cart=abc123; Path=/; SameSite=Lax; Max-Age=1209600"
 *
 * headers.append("Set-Cookie", cookie);
 * ```
 */
export function createCartCookie(cartId: string): string {
  const token = cartId.startsWith(CART_GID_PREFIX) ? cartId.slice(CART_GID_PREFIX.length) : cartId;
  const encoded = encodeURIComponent(token);
  return `${COOKIE_NAME}=${encoded}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_IN_SECONDS}`;
}

export function createExpiredCartCookie(): string {
  return `${COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`;
}
