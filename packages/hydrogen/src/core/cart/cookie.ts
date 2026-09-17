const COOKIE_NAME = "cart";
const BINDING_COOKIE_NAME = "__Host-hydrogen-cart";
const MAX_AGE_IN_SECONDS = 1209600; // 14 days
const CART_GID_PREFIX = "gid://shopify/Cart/";

type CartCookieSource = Request | { cookie?: string };

export function normalizeCartId(cartId: string | null | undefined): string | null {
  if (!cartId) return null;
  return cartId.startsWith(CART_GID_PREFIX) ? cartId : CART_GID_PREFIX + cartId;
}

export function getCartIdFromCookie(input: CartCookieSource): string | null {
  const values = readCartCookieValues(input, COOKIE_NAME);
  // Recover ordinary cart operations from cookie tossing without creating a new
  // cart on every request. Auth attachment below still rejects the ambiguity.
  return values.length > 1 ? getCartIdFromBindingCookie(input) : parseCartCookie(values);
}

// Browser enforcement of __Host- isolates the binding from sibling domains.
// Do not infer the browser's transport from request.url: TLS may terminate at
// a trusted proxy. The server sets this cookie HttpOnly on a resolved HTTPS origin.
export function getCartIdFromBindingCookie(input: CartCookieSource): string | null {
  return parseCartCookie(readCartCookieValues(input, BINDING_COOKIE_NAME));
}

export function getBoundCartId(request: Request): string | null {
  const boundCartId = getCartIdFromBindingCookie(request);
  const visibleCartId = parseCartCookie(readCartCookieValues(request, COOKIE_NAME));
  return boundCartId === visibleCartId ? boundCartId : null;
}

export function createCartBindingCookie(cartId: string): string {
  return `${BINDING_COOKIE_NAME}=${encodeURIComponent(cartId)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_IN_SECONDS}`;
}

export function createExpiredCartBindingCookie(): string {
  return `${BINDING_COOKIE_NAME}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readCartCookieValues(input: CartCookieSource, name: string): string[] {
  const header = input instanceof Request ? input.headers.get("cookie") : input.cookie;
  if (!header) return [];

  const values: string[] = [];
  for (const cookie of header.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    values.push(cookie.slice(separator + 1).trim());
  }
  return values;
}

function parseCartCookie(values: string[]): string | null {
  // Cookie headers omit Path and Domain. Never pick a winner among duplicates.
  if (values.length !== 1) return null;
  const [value] = values;
  try {
    return value ? normalizeCartId(decodeURIComponent(value)) : null;
  } catch {
    return null;
  }
}

export function createCartCookie(cartId: string): string {
  const token = cartId.startsWith(CART_GID_PREFIX) ? cartId.slice(CART_GID_PREFIX.length) : cartId;
  const encoded = encodeURIComponent(token);
  return `${COOKIE_NAME}=${encoded}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_IN_SECONDS}`;
}

export function createExpiredCartCookie(): string {
  return `${COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`;
}
