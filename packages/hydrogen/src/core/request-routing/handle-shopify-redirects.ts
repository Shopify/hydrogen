import type { StorefrontClient } from "../../client";
import { getLogger } from "../logging";
import type { ShopifyRouteTemplates } from "../standard-routes/index";
import { handleAdminRedirect } from "./interceptors/admin-redirect";
import { handleQueryParamRedirect } from "./interceptors/query-param-redirect";
import { handleStandardRouteRedirects } from "./interceptors/standard-routes";
import { handleUrlRedirects } from "./interceptors/url-redirects";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

const log = getLogger("redirects");

/** The unmatched request, the Storefront API client, and your app's route templates. */
export type RedirectOptions = {
  /** The request that your framework's router answered with a `404` response. */
  request: Request;
  /** The Storefront API client for the current request. Hydrogen looks up the store's URL redirects with the client, and reads the locale path prefix from the client's request context. */
  storefrontClient: StorefrontClient;
  /** Your app's route templates. Hydrogen redirects Shopify's default resource paths to these templates. */
  routeTemplates: ShopifyRouteTemplates;
};

/**
 * Finds the Shopify redirect for a request that your framework's router can't match. Call the
 * function when the router returns a `404` response, and return that `404` response when the function
 * resolves to `null`.
 *
 * The function checks these redirects in order and returns the first match as a `301` response: `/admin` to the store's admin, Shopify's default resource paths to your route templates, same-origin `return_to` and `redirect` query parameters, and the store's URL redirects. The response already carries the request context's headers. When a redirect lookup fails, the function logs the error and resolves to `null`.
 *
 * @param options The unmatched request, the Storefront API client, and your app's route templates.
 * @returns A promise for the matched redirect response, or `null` when no redirect matches.
 * @publicDocs
 */
export async function handleShopifyRedirects(options: RedirectOptions): Promise<Response | null> {
  const { request, storefrontClient } = options;
  let redirect: Response | null = null;

  try {
    redirect = handleAdminRedirect(options);
    redirect ??= handleStandardRouteRedirects(options);
    redirect ??= handleQueryParamRedirect(request);
    redirect ??= await handleUrlRedirects(options);
  } catch (error) {
    const url = new URL(request.url);
    log.error(`failed to resolve Shopify redirects for route ${url.pathname}`, { error });
  }

  return redirect ? safeApplyResponseHeaders(redirect, storefrontClient.requestContext) : null;
}
