import { handleProductVariantId } from "../product/accept-variant-id";
import { handleAjaxApi } from "./interceptors/ajax-api";
import { handleShopifyApiProxy } from "./interceptors/api-proxy";
import { handleBuyPermalinkRedirect, handleCheckoutRedirect } from "./interceptors/checkout";
import { handleMcpProxy } from "./interceptors/mcp-proxy";
import { handleSfapiProxy } from "./interceptors/sfapi-proxy";
import { handleUcpMcpProxy } from "./interceptors/ucp-mcp-proxy";
import { handleUcpProfileProxy } from "./interceptors/ucp-profile-proxy";
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
  handleUcpProfileProxy,
  handleWellKnownProxy,
  handleUcpMcpProxy,
  handleMcpProxy,
  handleAjaxApi,
] satisfies readonly HydrogenRouteInterceptor[];

/**
 * Serves Shopify's storefront endpoints and your custom route handlers.
 * Returns a promise for the matched response, or `null` when no route matches.
 * The matched response already carries the request context's headers.
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
 * Serves Shopify's storefront endpoints and your custom route handlers from your app. Call the function at the start of request handling, before your framework's router.
 *
 * When a route matches, the function returns a promise for the response. Return that response as is, because the response already carries the request context's headers. When no route matches, the function returns `null` synchronously, and your framework's router handles the request. The function throws when `requestContext` differs from the Storefront API client's request context. When a route handler throws, the returned promise rejects. Inside a `try` block, use `return await` on the result.
 *
 * The function checks these routes in order and returns the first match: the Shopify API proxy at `/__shopify`, the Storefront API proxy at `/api/{version}/graphql.json`, Liquid-style `?variant=` product URLs, registered handler groups, UCP buy permalinks at `/buy/...`, checkout and cart permalinks, the UCP business profile at `/.well-known/ucp`, allowlisted `.well-known` resources, the UCP MCP proxy at `/api/ucp/mcp`, the MCP proxy at `/api/mcp`, and AJAX cart URLs.
 *
 * Some routes answer unsupported methods with a `405` response. A registered handler path returns `405` for any method that no handler on that path registers. Checkout and cart permalinks accept only `GET` and `HEAD`. Buy permalinks accept only `GET`, and the UCP MCP proxy accepts only `POST`.
 *
 * When your bundler resolves the package's `development` export condition, the function also serves the GraphiQL explorer at `/graphiql` for GET requests that match no other route, and accepts a `graphiql` option. Set `graphiql.customerAccount` to an object with `apiUrl`, `accessToken`, and `schemaUrl` to add a Customer Account API tab. The explorer skips the tab when it can't fetch the schema.
 *
 * @publicDocs
 */
export type HandleShopifyRoutesForDocs =
  /**
   * @param options - The request, its context and session, the Storefront API client, your route templates, and your handler groups.
   * @returns A promise for the matched route's response, or `null` when no route matches.
   */
  (options: HydrogenRoutesOptions) => null | Promise<Response>;
