import type { RequestScopedPrivateStorefrontClient } from "../client";
import { handleAgentProxy } from "./interceptors/agent-proxy";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import { handleShopifyRouteHandlers, type ShopifyRouteHandlerGroup } from "./route-handlers";

export type HydrogenRoutesOptions = {
  request: Request;
  storefrontClient: RequestScopedPrivateStorefrontClient;
  handlers?: readonly ShopifyRouteHandlerGroup[];
};

export async function handleShopifyRoutes(
  options: HydrogenRoutesOptions,
): Promise<Response | null> {
  const sfapiProxy = await handleSfapiProxy(options);
  if (sfapiProxy) return sfapiProxy;

  const registeredRoute = await handleShopifyRouteHandlers(options);
  if (registeredRoute) return registeredRoute;

  const checkoutRedirect = await handleCheckoutRedirect(options);
  if (checkoutRedirect) return checkoutRedirect;

  const mcpProxy = await handleMcpProxy(options);
  if (mcpProxy) return mcpProxy;

  const agentProxy = await handleAgentProxy(options);
  if (agentProxy) return agentProxy;

  return handleAjaxApi(options);
}
