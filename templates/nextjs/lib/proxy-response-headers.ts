import type { ShopifyRequestContext } from "@shopify/hydrogen";

/**
 * Applies Hydrogen's response headers to the `NextResponse.next()` response that `proxy.ts`
 * returns for framework-routed requests.
 *
 * Next.js copies headers set by the proxy onto the final response before the route runs, and then
 * drops any header with the same name from a route handler's response. Only `Set-Cookie`, `Vary`
 * and the authenticate headers are appended. A `Link` header set here would therefore replace the
 * `Link` header of every route handler, so the proxy keeps the UCP discovery link that
 * `applyResponseHeaders` adds off this response. Responses returned by `handleShopifyRoutes` are
 * final, and keep it.
 */
export function applyProxyResponseHeaders(
  requestContext: Pick<ShopifyRequestContext, "applyResponseHeaders">,
  headers: Headers,
): void {
  const link = headers.get("link");
  requestContext.applyResponseHeaders(headers);
  if (link === null) headers.delete("link");
  else headers.set("link", link);
}
