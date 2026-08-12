import type { PrivateStorefrontClient } from "../../../client";
import {
  getStandardRouteTarget,
  isStandardRouteSelfRedirect,
  type ShopifyRouteTemplates,
} from "../../standard-routes/index";
import { createRedirectLocation, createRedirectResponse } from "./url-redirects";

export function handleStandardRouteRedirects({
  request,
  storefrontClient,
  routeTemplates,
}: {
  request: Request;
  storefrontClient: PrivateStorefrontClient;
  routeTemplates: ShopifyRouteTemplates;
}): Response | null {
  const url = new URL(request.url);
  const target = getStandardRouteTarget({
    pathname: url.pathname,
    pathPrefix: storefrontClient.requestContext.i18n.pathPrefix,
    routeTemplates,
  });

  if (!target) return null;

  const location = createRedirectLocation(target, url.searchParams);

  return isStandardRouteSelfRedirect(request.url, location)
    ? null
    : createRedirectResponse(location);
}
