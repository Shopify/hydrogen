import { applyNuxtResponseHeaders, createNuxtWebRequest } from "@shared/nuxt-event";

import { getCustomerAccountPageData } from "../../storefront/customer-account";

export default defineEventHandler(async (event) => {
  const { storefrontConfig } = event.context;
  if (!storefrontConfig) {
    throw new Error("Storefront configuration was not created for this server request.");
  }
  if (storefrontConfig.mode === "mock") {
    return { available: false, customer: null, error: null, loginFailed: false };
  }

  const { customerAccountClient, customerSessionManager, shopifyRequestContext } = event.context;
  if (!customerAccountClient || !customerSessionManager || !shopifyRequestContext) {
    throw new Error("Customer Account context was not created for this server request.");
  }

  const accountData = await getCustomerAccountPageData({
    request: createNuxtWebRequest(event),
    requestContext: shopifyRequestContext,
    sessionManager: customerSessionManager,
    customerAccount: customerAccountClient,
  });

  applyNuxtResponseHeaders(event, accountData.headers);

  return {
    available: true,
    customer: accountData.customer,
    error: accountData.error,
    loginFailed: accountData.loginFailed,
  };
});
