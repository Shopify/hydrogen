import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { createContext } from "react-router";

import type { CustomerAccountConfig } from "./config";
import { EncryptedCookieCustomerSession } from "./customer-session";

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
  requestContext: ShopifyRequestContext;
  sessionManager: WritableCustomerSessionManager;
} & (
  | {
      available: true;
      client: CustomerAccountClient;
      session: CustomerSession;
    }
  | {
      available: false;
      client?: never;
      session?: never;
    }
);

export const customerAccountContext = createContext<CustomerAccountRequestContext>();

const customerSessions = new Map<string, CustomerSession>();

export function getCustomerAccountSession(config: CustomerAccountConfig) {
  const key = `${config.shopId}:${config.customerAccountApiClientId}`;
  const existing = customerSessions.get(key);
  if (existing) return existing;

  const session = createCustomerSession({
    shopId: config.shopId,
    customerAccountApiClientId: config.customerAccountApiClientId,
  });
  customerSessions.set(key, session);
  return session;
}

export async function createCustomerSessionManager(request: Request, sessionSecret: string) {
  return EncryptedCookieCustomerSession.init(request, sessionSecret);
}
