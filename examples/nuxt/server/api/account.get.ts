import { applyNuxtResponseHeaders, createNuxtWebRequest } from "@shared/nuxt-event";

import { getCustomerAccountPageData } from "../../storefront/customer-account";

export default defineEventHandler(async (event) => {
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
    customer: accountData.customer,
    error: accountData.error,
    loginFailed: accountData.loginFailed,
  };
});
