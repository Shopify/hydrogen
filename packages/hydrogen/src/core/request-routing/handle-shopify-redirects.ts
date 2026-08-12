import type { PrivateStorefrontClient } from "../../client";
import { getLogger } from "../logging";
import type { ShopifyRouteTemplates } from "../standard-routes/index";
import { handleAdminRedirect } from "./interceptors/admin-redirect";
import { handleQueryParamRedirect } from "./interceptors/query-param-redirect";
import { handleStandardRouteRedirects } from "./interceptors/standard-routes";
import { handleUrlRedirects } from "./interceptors/url-redirects";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

const log = getLogger("redirects");

export type RedirectOptions = {
  request: Request;
  storefrontClient: PrivateStorefrontClient;
  routeTemplates: ShopifyRouteTemplates;
};

/**
 * Resolves Shopify redirects after framework routing returns a 404. Matched
 * responses already include request-context response headers.
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
