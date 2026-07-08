import { createCustomerAccountServerHandlers } from "@shopify/hydrogen/customer-account";

import { customerSession } from "./customer-account";

/**
 * Customer Account server handlers, registered (conditionally) in the root
 * middleware's `handleShopifyRoutes` wiring. Produces handlers for
 * `/account/login` (GET), `/account/logout` (POST), `/account/refresh` (GET),
 * and `/account/authorize` (GET) — all intercepted before framework routing,
 * so no route files are needed.
 */
export const customerSessionHandlers = createCustomerAccountServerHandlers({
  customerSession,
  defaultPostLoginRedirectPathname: "/account",
  postLogoutRedirectUri: "/",
});
