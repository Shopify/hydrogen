import type { StorefrontClient } from "../client";
import type { ShopifyRequestContext } from "./headers";
import { handleAgentProxy } from "./interceptors/agent-proxy";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import {
  handleShopifyRouteHandlers,
  type ShopifyRouteHandlerGroup,
  type ShopifyRouteSessionManager,
} from "./route-handlers";

export type HydrogenRoutesOptions = {
  request: Request;
  sessionManager: ShopifyRouteSessionManager;
  storefrontClient: StorefrontClient;
  requestContext: ShopifyRequestContext;
  handlers?: readonly ShopifyRouteHandlerGroup[];
};

export type HydrogenRouteHandler<TExtraOptions extends object = object> = (
  options: HydrogenRoutesOptions & TExtraOptions,
) => null | Promise<Response>;

export type HydrogenRouteInterceptor<TExtraOptions extends object = object> = (
  url: URL,
  ...args: Parameters<HydrogenRouteHandler<TExtraOptions>>
) => ReturnType<HydrogenRouteHandler<TExtraOptions>>;

/**
 * Matches a request against Shopify standard routes and any registered handler
 * groups, returning a raw `Response` (redirect or JSON) when one matches, or
 * `null` when none do. Use it as the first step of request handling, before
 * framework routing.
 */
export const handleShopifyRoutes: HydrogenRouteHandler = (options) => {
  assertSingleRequestContext(options);
  const url = new URL(options.request.url);

  const sfapiProxy = handleSfapiProxy(url, options);
  if (sfapiProxy) return applyResponseHeadersFromPromise(options, sfapiProxy);

  const registeredRoute = handleShopifyRouteHandlers(url, options);
  if (registeredRoute) return applyResponseHeadersFromPromise(options, registeredRoute);

  const checkoutRedirect = handleCheckoutRedirect(url, options);
  if (checkoutRedirect) return applyResponseHeadersFromPromise(options, checkoutRedirect);

  const mcpProxy = handleMcpProxy(url, options);
  if (mcpProxy) return applyResponseHeadersFromPromise(options, mcpProxy);

  const agentProxy = handleAgentProxy(url, options);
  if (agentProxy) return applyResponseHeadersFromPromise(options, agentProxy);

  const ajaxApi = handleAjaxApi(url, options);
  return ajaxApi ? applyResponseHeadersFromPromise(options, ajaxApi) : null;
};

function assertSingleRequestContext(options: HydrogenRoutesOptions): void {
  if (options.requestContext === options.storefrontClient.requestContext) return;
  throw new Error(
    "handleShopifyRoutes must receive the same requestContext used by storefrontClient.",
  );
}

function applyResponseHeadersFromPromise(
  options: HydrogenRoutesOptions,
  responsePromise: Promise<Response>,
): Promise<Response> {
  return responsePromise.then((response) => applyResponseHeadersFromOptions(options, response));
}

function applyResponseHeadersFromOptions(
  options: HydrogenRoutesOptions,
  response: Response,
): Response {
  try {
    options.requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutableResponse = new Response(response.body, response);
    options.requestContext.applyResponseHeaders(mutableResponse.headers);
    return mutableResponse;
  }
}
