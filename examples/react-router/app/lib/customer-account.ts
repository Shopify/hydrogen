import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { createContext } from "react-router";

/**
 * Per-request Customer Account context (NOT React component context) passed
 * from root middleware into loaders via `customerAccountContext`.
 *
 * `available` is false when the storefront is running against mock.shop (no
 * `PRIVATE_STOREFRONT_API_TOKEN`); in that case the customer account handlers
 * are not registered and loaders should short-circuit with a "requires a real
 * store" notice. `client` is still created — it is cheap (no network) and lets
 * the context shape stay uniform across both branches.
 */
export type CustomerAccountRequestContext = {
  available: boolean;
  client: CustomerAccountClient;
  requestContext: ShopifyRequestContext;
  session: CustomerSession;
  sessionManager: WritableCustomerSessionManager;
};

// Singleton — the customer session owns OAuth endpoints and the in-flight
// refresh dedupe map, both of which are stable for the app's lifetime.
export const customerSession = createCustomerSession({
  shopId: customerAccountConfig.shopId,
  customerAccountApiClientId: customerAccountConfig.customerAccountApiClientId,
});

export const customerAccountContext = createContext<CustomerAccountRequestContext>();

/**
 * Build a per-request, encrypted-cookie-backed session manager. Replaces the
 * in-memory `createRequestSessionManager` (which had no `commit()` and could
 * not persist tokens across the OAuth login → callback redirect). Cart and
 * predictive-search handlers never touch the session manager, so the swap is
 * safe.
 */
export async function createCustomerSessionManager(request: Request) {
  return EncryptedCookieCustomerSession.init(request, customerAccountConfig.sessionSecret);
}
