import { createRequestSessionManager } from "@shared/request-session";
import { createModeStorefrontClient } from "@shared/storefront-client";
import { resolveStorefrontMode } from "@shared/storefront-mode";
import { handleShopifyRoutes } from "@shopify/hydrogen";

import { cartHandlers } from "../../storefront/cart-handlers";
import {
  createRequestCustomerAccountClient,
  createCustomerSessionManager,
  customerSessionHandlers,
} from "../../storefront/customer-account";
import { predictiveSearchHandlers } from "../../storefront/predictive-search-handlers";
import { routeTemplates } from "../../utils/route-templates";

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const storefront = resolveStorefrontMode(process.env);
  event.context.storefrontConfig = {
    mode: storefront.mode,
    storeDomain: storefront.storeDomain,
  };
  const { requestContext, storefrontClient } = createModeStorefrontClient({ storefront, request });
  const { customerAccountsEnabled } = storefront;
  const sessionManager = customerAccountsEnabled
    ? await createCustomerSessionManager(request)
    : createRequestSessionManager(request);
  const customerAccountClient = customerAccountsEnabled
    ? createRequestCustomerAccountClient(requestContext)
    : undefined;
  const handlers = [
    cartHandlers,
    predictiveSearchHandlers,
    ...(customerAccountsEnabled ? [customerSessionHandlers] : []),
  ];

  const shopifyRoute = handleShopifyRoutes({
    request,
    requestContext,
    sessionManager,
    storefrontClient,
    routeTemplates,
    handlers,
  });
  if (shopifyRoute) {
    return sendWebResponse(event, await shopifyRoute);
  }

  event.context.shopifyRequestContext = requestContext;
  event.context.storefrontClient = storefrontClient;
  if (customerAccountsEnabled) {
    event.context.customerSessionManager = sessionManager;
    event.context.customerAccountClient = customerAccountClient;
  }
});
