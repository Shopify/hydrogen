import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import {
  createCartServerHandlers,
  handleShopifyRedirects,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

import { routeTemplates } from "../lib/route-templates";
import { applyStorefrontResponseHeaders, createStorefrontContext } from "../lib/storefront";

const cartHandlers = createCartServerHandlers();

export default Run.ALL(async (context, next) => {
  const { requestContext, storefrontClient } = createStorefrontContext(context.request);
  const sessionManager = await EncryptedCookieCustomerSession.init(
    context.request,
    customerAccountConfig.sessionSecret,
  );

  const shopifyRoute = handleShopifyRoutes({
    request: context.request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const response = await next({
    storefrontClient,
    storefrontRequestContext: requestContext,
  });

  if (response.status === 404 && ["GET", "HEAD"].includes(context.request.method)) {
    const redirect = await handleShopifyRedirects({
      request: context.request,
      routeTemplates,
      storefrontClient,
    });
    if (redirect) return redirect;
  }

  return applyStorefrontResponseHeaders(requestContext, response);
});
