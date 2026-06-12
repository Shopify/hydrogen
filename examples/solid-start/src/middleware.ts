import { getBuyerIp } from "@shared/buyer-ip";
import { storefrontConfig } from "@shared/config";
import { getPrivateStorefrontToken } from "@shared/private-env";
import { handleShopifyRoutes } from "@shopify/hydrogen";
import {
  createCartServerHandlers,
  createStorefrontClient,
  createStorefrontRequestContext,
  type StorefrontRequestContext,
} from "@shopify/hydrogen";
import { createMiddleware } from "@solidjs/start/middleware";

const cartHandlers = createCartServerHandlers();

// Hydrogen-owned and registered routes run pre-routing.
// Redirects are handled in `routes/[...404].tsx` so the SFAPI URL-redirects
// lookup only fires when the framework router has no match — same gate the
// other framework examples use, expressed as a route instead of a hook.

export default createMiddleware({
  onRequest: [
    async (event) => {
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
    },
  ],
  onBeforeResponse: [
    (event) => {
      event.locals.storefrontRequestContext?.applyResponseHeaders(event.response.headers);
    },
  ],
});

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
