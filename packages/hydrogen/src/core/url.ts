export const SFAPI_RE = /^\/api\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;
export const SHOPIFY_API_PROXY_PREFIX = "/__shopify";
export const SHOPIFY_API_PROXY_RE = /^\/__shopify(?:\/|$)/;
export const MCP_RE = /^\/api\/mcp$/;
export const UCP_MCP_RE = /^\/api\/ucp\/mcp$/;
export const CHECKOUT_RE = /^\/checkout$/;
export const CART_PERMALINK_RE = /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/;
const BUY_ITEM_PAIR = String.raw`(?:[A-Za-z0-9._-]+|~[A-Za-z0-9_-]+):[1-9]\d*`;
// Items are required so a storefront's own /buy pages keep routing to the app.
export const BUY_PERMALINK_RE = new RegExp(`^/buy/${BUY_ITEM_PAIR}(?:,${BUY_ITEM_PAIR})*$`);
export const CUSTOMER_ACCOUNT_PATHS = {
  authorize: "/account/authorize",
  login: "/account/login",
  logout: "/account/logout",
  refresh: "/account/refresh",
} as const;

const CUSTOMER_ACCOUNT_HANDOFF_PATHS: ReadonlySet<string> = new Set(
  Object.values(CUSTOMER_ACCOUNT_PATHS),
);

/**
 * Returns whether the pathname conventionally represents a Hydrogen document-level server handoff.
 *
 * Keep this aligned with the routes intercepted before framework routing. API and protocol
 * interceptors are intentionally excluded because they are not browser navigation destinations.
 */
export function isHydrogenServerHandoffPath(pathname: string): boolean {
  return (
    CHECKOUT_RE.test(pathname) ||
    CART_PERMALINK_RE.test(pathname) ||
    BUY_PERMALINK_RE.test(pathname) ||
    CUSTOMER_ACCOUNT_HANDOFF_PATHS.has(pathname)
  );
}

/**
 * Allowlisted `.well-known` resources proxied to the Online Store origin:
 * - `apple-developer-merchantid-domain-association` — Apple Pay domain verification.
 * - `shopify/fec/produce` — Frontend Event Collector ingress. On the Online
 *   Store the myshopify.com edge forwards this first-party path to the
 *   collector; headless storefronts have no such edge, so Hydrogen proxies it
 *   to the same origin (used by WebMCP's Event Refinery client).
 */
export const WELL_KNOWN_RE =
  /^\/\.well-known\/(?:apple-developer-merchantid-domain-association|shopify\/fec\/produce)$/;
export const AJAX_CART_RE =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i;

/**
 * Normalizes `target` to a path on `origin` that is safe to use as a redirect location.
 * Returns `undefined` unless `target` is a path starting with `/` or an absolute URL,
 * and stays on `origin`.
 */
export function getSameOriginPath(
  target: string | null | undefined,
  origin: string,
): string | undefined {
  if (!target) return undefined;

  try {
    // Parse absolute URLs without a base so scheme-relative forms like `https:evil.example`
    // resolve to their own host, as a browser would, instead of onto `origin`.
    const url = target.startsWith("/") ? new URL(target, origin) : new URL(target);
    if (url.origin !== origin) return undefined;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // The parsed pathname can itself start with `//` (e.g. from `/x/..//evil`),
    // which a redirect would resolve as a protocol-relative URL to another host.
    return path.startsWith("//") ? undefined : path;
  } catch {
    return undefined;
  }
}

export function normalizeStoreDomain(domain: string): string {
  if (!domain) {
    throw new Error("Storefront `storeDomain` is required.");
  }

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain.replace(/\/+$/, "");
  }
  return `https://${domain}`.replace(/\/+$/, "");
}
