const COOKIE_NAME = "cart";
const MAX_AGE_IN_SECONDS = 1209600; // 14 days
const CART_GID_PREFIX = "gid://shopify/Cart/";

export type CartCookieSource = Request | { cookie?: string };

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

export function createCartCookie(cartId: string): string {
  const token = cartId.startsWith(CART_GID_PREFIX) ? cartId.slice(CART_GID_PREFIX.length) : cartId;
  const encoded = encodeURIComponent(token);
  return `${COOKIE_NAME}=${encoded}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_IN_SECONDS}`;
}
