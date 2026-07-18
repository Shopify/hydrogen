import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import { createMiddleware } from "@tanstack/react-start";

import { routeTemplates } from "./route-templates";

/** Run Hydrogen's framework-neutral standard routes before the file router. */
export const storefrontMiddleware = createMiddleware().server(
  async ({ request, context, handlerType, next }) => {
    const shopifyResponse = await handleShopifyRoutes({
      request,
      requestContext: context.shopifyRequestContext,
      sessionManager: context.customerAccount.sessionManager,
      storefrontClient: context.storefrontClient,
      handlers: context.shopifyRouteHandlers,
    });
    if (shopifyResponse) return shopifyResponse;

    const result = await next();
    if (handlerType !== "router" || result.response.status !== 404) return result;

    return (
      (await handleShopifyRedirects({
        request,
        storefrontClient: context.storefrontClient,
        routeTemplates,
      })) ?? result
    );
  },
);
