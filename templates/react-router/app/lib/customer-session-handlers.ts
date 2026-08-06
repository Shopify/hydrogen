import {
  createCustomerAccountServerHandlers,
  type CustomerSession,
} from "@shopify/hydrogen/customer-account";

export function createCustomerSessionHandlers(customerSession: CustomerSession) {
  return createCustomerAccountServerHandlers({
    customerSession,
    defaultPostLoginRedirectPathname: "/account",
    loginFailedRedirectPath: "/account?login=failed",
    postLogoutRedirectUri: "/",
  });
}
