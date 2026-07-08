import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";

import { customerSession } from "./customer-account";

export const customerSessionHandlers = createCustomerAccountServerHandlers({
  customerSession,
  defaultPostLoginRedirectPathname: "/account",
  postLogoutRedirectUri: "/",
});
