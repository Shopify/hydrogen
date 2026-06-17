import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { handleShopifyRedirects, handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import type { Handle } from "@sveltejs/kit";

export const cartHandlers = createCartServerHandlers();

export const handle: Handle = async ({ event, resolve }) => {
  const requestContext = createStorefrontRequestContext(event.request);
  const storefrontClient = createPrivateStorefrontClient(event.request, requestContext);

  const kitRoute = await handleShopifyRoutes({
    request: event.request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (kitRoute) return kitRoute;

  event.locals.storefrontRequestContext = requestContext;
  event.locals.storefrontClient = storefrontClient;

  const response = await resolve(event);

  if (response.status === 404) {
    const redirect = await handleShopifyRedirects({
      request: event.request,
      storefrontClient,
    });
    if (redirect) {
      return applyStorefrontResponseHeaders(requestContext, redirect);
    }
  }

  return applyStorefrontResponseHeaders(requestContext, response);
};

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
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: storefrontConfig.storeDomain,
      i18n: storefrontConfig.i18n,
      privateStorefrontToken: getPrivateStorefrontToken(),
      buyerIp: getBuyerIp(request.headers),
      requestContext,
    },
  });
}
