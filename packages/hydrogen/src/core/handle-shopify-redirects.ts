import type { PrivateStorefrontClient } from "../client";
import { handleAdminRedirect } from "./interceptors/admin-redirect";
import { handleQueryParamRedirect } from "./interceptors/query-param-redirect";
import { handleStandardRouteRedirects } from "./interceptors/standard-routes";
import { handleUrlRedirects } from "./interceptors/url-redirects";
import type { ShopifyRouteTemplates } from "./standard-routes/index";

export type RedirectOptions = {
  request: Request;
  storefrontClient: PrivateStorefrontClient;
  routeTemplates: ShopifyRouteTemplates;
};

export async function handleShopifyRedirects(options: RedirectOptions): Promise<Response | null> {
  const { request } = options;

  try {
    const adminRedirect = await handleAdminRedirect(options);
    if (adminRedirect) return adminRedirect;

    const standardRouteRedirect = await handleStandardRouteRedirects(options);
    if (standardRouteRedirect) return standardRouteRedirect;

    const urlRedirect = await handleUrlRedirects(options);
    if (urlRedirect) return urlRedirect;
  } catch (error) {
    const url = new URL(request.url);
    console.error(`Failed to resolve Shopify redirects for route ${url.pathname}`, error);
  }

  return handleQueryParamRedirect(request);
}
