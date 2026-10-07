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
  /** The request that your framework's router answered with a 404 response. */
  request: Request;
  /** The Storefront API client for the current request. Hydrogen queries URL redirects with it and reads the locale path prefix from its request context. */
  storefrontClient: StorefrontClient;
  /** Your app's custom route templates. Standard route redirects send Shopify's default paths to them. */
  routeTemplates: ShopifyRouteTemplates;
};

/**
 * Resolves Shopify redirects for a request that your framework's router answered with a 404
 * response.
 *
 * The function checks the `/admin` path, standard route redirects, same-origin `return_to` and `redirect` query parameters, and storefront URL redirects, in that order. The function returns the first match as a 301 response that already carries the request context's response headers. When nothing matches, the function resolves to `null`. When redirect resolution fails, the function also resolves to `null`, and Hydrogen logs the failure. Return the router's 404 response when the result is `null`.
 *
 * @param options The unmatched request, the Storefront API client, and the app's route templates.
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
