import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import { createCartServerHandlers } from "@shopify/hydrogen";

import {
  applyStorefrontResponseHeaders,
  createPrivateStorefrontContext,
} from "../../lib/storefront";

const cartHandlers = createCartServerHandlers();

export default Run.ALL(async (context, next) => {
  const { requestContext, storefrontClient } = createPrivateStorefrontContext(context.request);

  const shopifyRoute = await handleShopifyRoutes({
    request: context.request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return applyStorefrontResponseHeaders(requestContext, shopifyRoute);

  const response = await next({
    storefrontClient,
    storefrontRequestContext: requestContext,
  });

  if (response.status === 404 && ["GET", "HEAD"].includes(context.request.method)) {
    const redirect = await handleShopifyRedirects({
      request: context.request,
      storefrontClient,
    });
    if (redirect) return applyStorefrontResponseHeaders(requestContext, redirect);
  }

  return applyStorefrontResponseHeaders(requestContext, response);
});
