export const SFAPI_RE = /^\/api\/(unstable|2\d{3}-\d{2})\/graphql\.json$/;
export const MCP_RE = /^\/api\/mcp$/;
export const CART_RE = /^\/api\/cart$/;
export const CHECKOUT_RE = /^\/checkout$/;
export const CART_PERMALINK_RE = /^\/cart\/\d+:\d+(?:,\d+:\d+)*$/;
export const AGENT_RE = /^\/agent\//;
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
