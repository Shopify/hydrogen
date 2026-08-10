import {
  handleShopifyRedirects,
  handleShopifyRoutes,
  type ShopifyRequestContext,
} from "@shopify/hydrogen";
import { createRequestHandler, RouterContextProvider } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { cartHandlers } from "~/lib/cart-handlers";
import { envContext } from "~/lib/env";
import { routeTemplates } from "~/lib/route-templates";
import { createRequestSessionManager } from "~/lib/session";
import { createRequestStorefrontClient } from "~/lib/storefront";

function withStorefrontHeaders(response: Response, requestContext: ShopifyRequestContext) {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutable = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutable.headers);
    return mutable;
  }
}

/**
 * Export a fetch handler in module format for Oxygen / mini-oxygen.
 */
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const storefrontClient = createRequestStorefrontClient(request, env);
      const requestContext = storefrontClient.requestContext;
      const sessionManager = createRequestSessionManager(request);

      const shopifyRoute = handleShopifyRoutes({
        request,
        requestContext,
        sessionManager,
        storefrontClient,
        handlers: [cartHandlers],
      });
      if (shopifyRoute) {
        return withStorefrontHeaders(await shopifyRoute, requestContext);
      }

      const method = request.method;
      if ((method === "GET" || method === "HEAD") && request.body) {
        return new Response(`${method} requests cannot have a body`, { status: 400 });
      }

      const url = new URL(request.url);
      if (url.pathname.includes("//")) {
        return new Response(null, {
          status: 301,
          headers: { location: url.pathname.replace(/[/]+/g, "/") },
        });
      }

      const routerContext = new RouterContextProvider();
      routerContext.set(envContext, env);
      routerContext.env = env;
      routerContext.waitUntil = executionContext.waitUntil.bind(executionContext);

      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);
      const response = await handleRequest(request, routerContext as never);

      requestContext.applyResponseHeaders(response.headers);
      response.headers.append("powered-by", "Shopify, Hydrogen");

      if (response.status === 404) {
        const redirect = await handleShopifyRedirects({
          request,
          storefrontClient,
          routeTemplates,
        });
        if (redirect) return withStorefrontHeaders(redirect, requestContext);
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
