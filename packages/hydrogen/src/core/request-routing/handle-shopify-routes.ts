import { handleProductVariantId } from "../product/accept-variant-id";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleShopifyApiProxy } from "./interceptors/api-proxy";
import { handleBuyPermalinkRedirect, handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import { handleUcpMcpProxy } from "./interceptors/ucp-mcp-proxy";
import { handleWellKnownProxy } from "./interceptors/well-known";
import { handleShopifyRouteHandlers } from "./registered-routes";
import type {
  HydrogenRouteHandler,
  HydrogenRouteInterceptor,
  HydrogenRoutesOptions,
} from "./route-types";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

const SHOPIFY_ROUTE_INTERCEPTORS = [
  handleShopifyApiProxy,
  handleSfapiProxy,
  handleProductVariantId,
  handleShopifyRouteHandlers,
  handleBuyPermalinkRedirect,
  handleCheckoutRedirect,
  handleWellKnownProxy,
  handleUcpMcpProxy,
  handleMcpProxy,
  handleAjaxApi,
] satisfies readonly HydrogenRouteInterceptor[];

/**
 * Matches a request against Shopify standard routes and registered handler
 * groups. Returns a promise for the matched response, or `null` when no route
 * matches. The matched response already carries the request context's
 * response headers.
 *
 * @publicDocs
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

/**
 * Serves Shopify standard routes and your registered route handlers. Call the function first in request handling, before framework routing.
 *
 * When a route matches, the function returns a promise for a response that already carries the request context's response headers. Return that response without applying the headers again. When no route matches, the function returns `null` synchronously. The function throws when `requestContext` differs from the Storefront API client's request context. When a route handler throws, the returned promise rejects. Inside a request-level `try` block, use `return await` on the result.
 *
 * The function checks routes in this order and returns the first match: the Shopify API proxy at `/__shopify`, the Storefront API proxy at `/api/{version}/graphql.json`, Liquid-style `?variant=` product URLs, registered handler groups, UCP buy permalinks at `/buy/...`, checkout and cart permalinks, allowlisted `.well-known` resources, the UCP MCP proxy at `/api/ucp/mcp`, the MCP proxy at `/api/mcp`, and AJAX cart URLs.
 *
 * Some routes answer unsupported methods with a 405 response. A registered handler path returns 405 for any method that no handler on that path registers. Checkout and cart permalinks accept only GET and HEAD. Buy permalinks accept only GET, and the UCP MCP proxy accepts only POST.
 *
 * When your bundler resolves the package's `development` export condition, the function also serves the GraphiQL explorer at `/graphiql` for GET requests that match no other route, and accepts a `graphiql` option. Set `graphiql.customerAccount` to an object with `apiUrl`, `accessToken`, and `schemaUrl` to add a Customer Account API tab. The explorer skips the tab when it can't fetch the schema.
 *
 * @publicDocs
 */
export type HandleShopifyRoutesForDocs =
  /**
   * @param options - The request, request context, Storefront API client, route templates, and registered handler groups.
   * @returns A promise for the matched route's response, or `null` when no route matches.
   */
  (options: HydrogenRoutesOptions) => null | Promise<Response>;
