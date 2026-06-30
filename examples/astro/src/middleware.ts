import { getBuyerIp } from "@shared/buyer-ip";
import { createExampleStorefrontClient } from "@shared/storefront-client";
import {
  createCartServerHandlers,
  createStorefrontRequestContext,
  handleShopifyRedirects,
  handleShopifyRoutes,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import { defineMiddleware } from "astro:middleware";

const cartHandlers = createCartServerHandlers();

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createPrivateStorefrontClient(request, requestContext);

  const kitRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  locals.storefrontRequestContext = requestContext;
  locals.storefrontClient = storefrontClient;

  const response = await next();

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request,
      storefrontClient,
    });
    if (redirect) {
      return applyStorefrontResponseHeaders(requestContext, redirect);
    }
  }

  return applyStorefrontResponseHeaders(requestContext, response);
});

function applyStorefrontResponseHeaders(
  requestContext: Pick<StorefrontRequestContext, "applyResponseHeaders">,
  response: Response,
): Response {
  try {
    requestContext.applyResponseHeaders(response.headers);
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const mutableResponse = new Response(response.body, response);
    requestContext.applyResponseHeaders(mutableResponse.headers);
    return mutableResponse;
  }
}

function createPrivateStorefrontClient(request: Request, requestContext: StorefrontRequestContext) {
  return createExampleStorefrontClient({
    requestContext,
    buyerIp: getBuyerIp(request.headers),
  });
}
