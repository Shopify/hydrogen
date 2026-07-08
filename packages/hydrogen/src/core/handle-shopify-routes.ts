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

export async function handleShopifyRoutes(
  options: HydrogenRoutesOptions,
): Promise<Response | null> {
  assertSingleRequestContext(options);

  const sfapiProxy = await handleSfapiProxy(options);
  if (sfapiProxy) return applyRouteResponseHeaders(options, sfapiProxy);

  const registeredRoute = await handleShopifyRouteHandlers(options);
  if (registeredRoute) return applyRouteResponseHeaders(options, registeredRoute);

  const checkoutRedirect = await handleCheckoutRedirect(options);
  if (checkoutRedirect) return applyRouteResponseHeaders(options, checkoutRedirect);

  const mcpProxy = await handleMcpProxy(options);
  if (mcpProxy) return applyRouteResponseHeaders(options, mcpProxy);

  const agentProxy = await handleAgentProxy(options);
  if (agentProxy) return applyRouteResponseHeaders(options, agentProxy);

  const ajaxApi = await handleAjaxApi(options);
  return ajaxApi ? applyRouteResponseHeaders(options, ajaxApi) : null;
}

function assertSingleRequestContext(options: HydrogenRoutesOptions): void {
  if (options.requestContext === options.storefrontClient.requestContext) return;
  throw new Error(
    "handleShopifyRoutes must receive the same requestContext used by storefrontClient.",
  );
}

function applyRouteResponseHeaders(options: HydrogenRoutesOptions, response: Response): Response {
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
