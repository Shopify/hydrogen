import { getBuyerIp } from "@shared/buyer-ip";
import { defaultI18n } from "@shared/config";
import { createRequestSessionManager } from "@shared/request-session";
import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
} from "@shopify/hydrogen";

import { cartHandlers } from "../../storefront/cart-handlers";
import {
  createRequestCustomerAccountClient,
  createCustomerSessionManager,
  customerSessionHandlers,
} from "../../storefront/customer-account";
import { predictiveSearchHandlers } from "../../storefront/predictive-search-handlers";
import { resolveStorefrontConfig } from "../../storefront/storefront-config";
import { routeTemplates } from "../../utils/route-templates";

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const storefront = resolveStorefrontConfig(process.env);
  event.context.storefrontConfig = {
    mode: storefront.mode,
    storeDomain: storefront.storeDomain,
  };
  const { requestContext, storefrontClient } =
    storefront.mode === "mock"
      ? createMockStorefront(request, storefront.storeDomain)
      : createPrivateStorefront(request, storefront.storeDomain, storefront.privateStorefrontToken);
  const customerAccountsEnabled = storefront.mode === "private";
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

function createMockStorefront(request: Request, storeDomain: string) {
  const requestContext = createShopifyRequestContext({ request, i18n: defaultI18n });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: { storeDomain },
  });

  return { requestContext, storefrontClient };
}

function createPrivateStorefront(
  request: Request,
  storeDomain: string,
  privateStorefrontToken: string,
) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: defaultI18n,
    buyerIp: getBuyerIp(request.headers),
  });
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext,
    config: { storeDomain, privateStorefrontToken },
  });

  return { requestContext, storefrontClient };
}
