import { getBuyerIp } from "@shared/buyer-ip";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  createStorefrontRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createStorefrontClient } from "@shopify/hydrogen";
import { createRequestHandler } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { cartHandlers } from "~/lib/cart-handlers";
import { createHydrogenRouterContext } from "~/lib/context";

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const i18n = { country: "US", language: "EN" } as const;

      const storefrontRequestContext = createStorefrontRequestContext(request);
      const storefrontClient = createStorefrontClient({
        type: "private",
        config: {
          storeDomain: env.PUBLIC_STORE_DOMAIN,
          privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN || getPrivateStorefrontToken(),
          i18n,
          buyerIp: getBuyerIp(request.headers),
          requestContext: storefrontRequestContext,
        },
      });

      const shopifyRoute = await handleShopifyRoutes({
        request,
        storefrontClient,
        handlers: [cartHandlers],
      });
      if (shopifyRoute) return shopifyRoute;

      // TODO: This is done in Hydrogen's request handler
      const method = request.method;
      if ((method === "GET" || method === "HEAD") && request.body) {
        return new Response(`${method} requests cannot have a body`, { status: 400 });
      }

      // TODO: This is done in Hydrogen's request handler
      const url = new URL(request.url);
      if (url.pathname.includes("//")) {
        return new Response(null, {
          status: 301,
          headers: { location: url.pathname.replace(/\/+/g, "/") },
        });
      }

      const routerContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
        storefrontRequestContext,
      );

      /**
       * Create a React Router request handler directly. Hydrogen dev-preview handles
       * Shopify-owned routes above, so Hydrogen's SFAPI/MCP proxy wrapper is redundant.
       */
      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);

      const response = await handleRequest(request, routerContext as any);

      if (routerContext.session.isPending) {
        response.headers.set("Set-Cookie", await routerContext.session.commit());
      }

      storefrontRequestContext.applyResponseHeaders(response.headers);
      response.headers.append("powered-by", "Shopify, Hydrogen");

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If no redirect matches, `handleShopifyRedirects` returns `null`
         * and we pass through the original 404 response.
         */
        const redirect = await handleShopifyRedirects({ request, storefrontClient });
        if (redirect) return redirect;
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};
