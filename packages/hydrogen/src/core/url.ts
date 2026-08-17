export const SFAPI_RE = /^\/api\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;
export const SHOPIFY_API_PROXY_PREFIX = "/__shopify";
export const SHOPIFY_API_PROXY_RE = /^\/__shopify(?:\/|$)/;
export const MCP_RE = /^\/api\/mcp$/;
export const CHECKOUT_RE = /^\/checkout$/;
export const CART_PERMALINK_RE = /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/;
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
    CUSTOMER_ACCOUNT_HANDOFF_PATHS.has(pathname)
  );
}

export const AGENT_BUYER_CLAIMS_RE =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/agent\/(?:handoff|buyer-claims)(?:\.[^/.]+)?\/?$/i;
export const WELL_KNOWN_RE = /^\/\.well-known\/(?:apple-developer-merchantid-domain-association)$/;
export const AJAX_CART_RE =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/cart(?:\.(?:js|json)|\/(?:add|update|change|clear)(?:\.(?:js|json))?)$/i;

export function normalizeStoreDomain(domain: string): string {
  if (!domain) {
    throw new Error("Storefront `storeDomain` is required.");
  }

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain.replace(/\/+$/, "");
  }
  return `https://${domain}`.replace(/\/+$/, "");
}
