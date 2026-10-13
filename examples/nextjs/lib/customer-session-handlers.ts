import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";

import { getCustomerSession } from "./customer-account";

let customerSessionHandlers: ReturnType<typeof createCustomerAccountServerHandlers> | undefined;

export function getCustomerSessionHandlers() {
  return (customerSessionHandlers ??= createCustomerAccountServerHandlers({
    customerSession: getCustomerSession(),
    defaultPostLoginRedirectPathname: "/account",
    postLogoutRedirectUri: "/",
  }));
}
