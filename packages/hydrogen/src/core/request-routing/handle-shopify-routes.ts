import { handleAgentProxy } from "./interceptors/agent-proxy";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleShopifyApiProxy } from "./interceptors/api-proxy";
import { handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import { handleUcpMcpProxy } from "./interceptors/ucp-mcp-proxy";
import { handleWellKnownProxy } from "./interceptors/well-known";
import { handleShopifyRouteHandlers } from "./registered-routes";
import type { HydrogenRouteHandler, HydrogenRouteInterceptor } from "./route-types";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

const SHOPIFY_ROUTE_INTERCEPTORS = [
  handleShopifyApiProxy,
  handleSfapiProxy,
  handleShopifyRouteHandlers,
  handleCheckoutRedirect,
  handleWellKnownProxy,
  handleUcpMcpProxy,
  handleMcpProxy,
  handleAgentProxy,
  handleAjaxApi,
] satisfies readonly HydrogenRouteInterceptor[];

/**
 * Matches a request against Shopify standard routes and any registered handler
 * groups, returning a raw `Response` (redirect or JSON) when one matches, or
 * `null` when none do. Use it as the first step of request handling, before
 * framework routing. Matched responses already include request-context
 * response headers.
 */
export const handleShopifyRoutes: HydrogenRouteHandler = (options) => {
  if (options.requestContext !== options.storefrontClient.requestContext) {
    throw new Error(
      "handleShopifyRoutes must receive the same requestContext used by storefrontClient.",
    );
  }

  const url = new URL(options.request.url);

  for (const interceptor of SHOPIFY_ROUTE_INTERCEPTORS) {
    const responsePromise = interceptor(url, options);
    if (!responsePromise) continue;

    return responsePromise.then((response) =>
      safeApplyResponseHeaders(response, options.requestContext),
    );
  }

  return null;
};
