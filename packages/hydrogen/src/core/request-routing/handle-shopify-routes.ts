import { handleAgentProxy } from "./interceptors/agent-proxy";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleShopifyApiProxy } from "./interceptors/api-proxy";
import { handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import { handleShopifyRouteHandlers } from "./registered-routes";
import type { HydrogenRouteHandler, HydrogenRouteInterceptor } from "./route-types";

export type {
  HydrogenRouteHandler,
  HydrogenRouteInterceptor,
  HydrogenRoutesOptions,
} from "./route-types";

const SHOPIFY_ROUTE_INTERCEPTORS = [
  handleShopifyApiProxy,
  handleSfapiProxy,
  handleShopifyRouteHandlers,
  handleCheckoutRedirect,
  handleMcpProxy,
  handleAgentProxy,
  handleAjaxApi,
] satisfies readonly HydrogenRouteInterceptor[];

/**
 * Matches a request against Shopify standard routes and any registered handler
 * groups, returning a raw `Response` (redirect or JSON) when one matches, or
 * `null` when none do. Use it as the first step of request handling, before
 * framework routing.
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

    return responsePromise.then((response) => {
      try {
        options.requestContext.applyResponseHeaders(response.headers);
        return response;
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
      }

      const mutableResponse = new Response(response.body, response);
      options.requestContext.applyResponseHeaders(mutableResponse.headers);
      return mutableResponse;
    });
  }

  return null;
};
