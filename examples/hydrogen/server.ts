import { getBuyerIp } from "@shared/buyer-ip";
import { getPrivateStorefrontToken } from "@shared/private-env";
import {
  createPredictiveSearchServerHandlers,
  createShopifyRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { createStorefrontClient } from "@shopify/hydrogen";
import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";
import { createRequestHandler } from "react-router";
import * as serverBuild from "virtual:react-router/server-build";

import { cartHandlers } from "~/lib/cart-handlers";
import { createHydrogenRouterContext } from "~/lib/context";
import { createCustomerAccountContext, createCustomerSessionManager } from "~/lib/customer-account";
import { getLocaleFromRequest } from "~/lib/i18n";
import { routeTemplates } from "~/lib/route-templates";

const predictiveSearchHandlers = createPredictiveSearchServerHandlers();
const HTTPS_PROTOCOL = "https:";
const FORWARDED_PROTO_HEADER = "x-forwarded-proto";
const FORWARDED_HOST_HEADER = "x-forwarded-host";
const TRY_HYDROGEN_HOST_SUFFIX = ".tryhydrogen.dev";

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    try {
      const publicRequest = createPublicRequest(request);
      const i18n = getLocaleFromRequest(publicRequest);

      const shopifyRequestContext = createShopifyRequestContext({
        request: publicRequest,
        i18n,
      });
      const storefrontClient = createStorefrontClient({
        type: "private",
        requestContext: shopifyRequestContext,
        config: {
          storeDomain: env.PUBLIC_STORE_DOMAIN,
          privateStorefrontToken: getPrivateStorefrontToken(env),
          buyerIp: getBuyerIp(request.headers),
        },
      });
      const customerSessionManager = await createCustomerSessionManager(
        publicRequest,
        env.SESSION_SECRET,
      );
      const customerAccount = createCustomerAccountContext({
        config: {
          shopId: env.SHOP_ID,
          customerAccountApiClientId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
        },
        requestContext: shopifyRequestContext,
        sessionManager: customerSessionManager,
      });
      const customerAccountHandlers = createCustomerAccountServerHandlers({
        customerSession: customerAccount.session,
        defaultPostLoginRedirectPathname: "/account",
        loginFailedRedirectPath: "/account?login=failed",
        postLogoutRedirectUri: "/",
      });

      const shopifyRoute = await handleShopifyRoutes({
        request: publicRequest,
        requestContext: shopifyRequestContext,
        sessionManager: customerSessionManager,
        storefrontClient,
        handlers: [cartHandlers, predictiveSearchHandlers, customerAccountHandlers],
      });
      if (shopifyRoute) return shopifyRoute;

      const routerContext = await createHydrogenRouterContext(
        publicRequest,
        env,
        executionContext,
        shopifyRequestContext,
        customerAccount,
      );

      // TODO: This is done in Hydrogen's request handler
      const method = publicRequest.method;
      if ((method === "GET" || method === "HEAD") && publicRequest.body) {
        return new Response(`${method} requests cannot have a body`, { status: 400 });
      }

      // TODO: This is done in Hydrogen's request handler
      const url = new URL(publicRequest.url);
      if (url.pathname.includes("//")) {
        return new Response(null, {
          status: 301,
          headers: { location: url.pathname.replace(/\/+/g, "/") },
        });
      }

      /**
       * Create a React Router request handler directly. Hydrogen dev-preview handles
       * Shopify-owned routes above, so Hydrogen's SFAPI/MCP proxy wrapper is redundant.
       */
      const handleRequest = createRequestHandler(serverBuild, process.env.NODE_ENV);

      const response = await finalizeHydrogenResponse(
        await handleRequest(publicRequest, routerContext),
        routerContext,
        shopifyRequestContext,
      );

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If no redirect matches, `handleShopifyRedirects` returns `null`
         * and we pass through the original 404 response.
         */
        const redirect = await handleShopifyRedirects({
          request: publicRequest,
          routeTemplates,
          storefrontClient,
        });
        if (redirect) {
          return finalizeHydrogenResponse(redirect, routerContext, shopifyRequestContext);
        }
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response("An unexpected error occurred", { status: 500 });
    }
  },
};

function createPublicRequest(request: Request): Request {
  const publicUrl = getPublicUrl(request);
  if (publicUrl === request.url) return request;
  return new Request(publicUrl, request);
}

function getPublicUrl(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get(FORWARDED_HOST_HEADER);
  const forwardedProto = request.headers.get(FORWARDED_PROTO_HEADER);

  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  if (url.hostname.endsWith(TRY_HYDROGEN_HOST_SUFFIX)) url.protocol = HTTPS_PROTOCOL;

  return url.toString();
}

async function finalizeHydrogenResponse(
  response: Response,
  routerContext: Awaited<ReturnType<typeof createHydrogenRouterContext>>,
  shopifyRequestContext: ReturnType<typeof createShopifyRequestContext>,
) {
  const mutableResponse = new Response(response.body, response);

  if (routerContext.session.isPending) {
    appendHeaders(await routerContext.session.commit(), mutableResponse.headers);
  }

  appendHeaders(
    await routerContext.customerAccount.sessionManager.commit?.(),
    mutableResponse.headers,
  );
  shopifyRequestContext.applyResponseHeaders(mutableResponse.headers);
  mutableResponse.headers.append("powered-by", "Shopify, Hydrogen");

  return mutableResponse;
}

function appendHeaders(source: HeadersInit | void, target: Headers) {
  if (!source) return;
  new Headers(source).forEach((value, key) => target.append(key, value));
}
