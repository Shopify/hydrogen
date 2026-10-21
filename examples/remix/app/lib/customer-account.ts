import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerSession,
  type CustomerAccountClient,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import type { Session } from "remix/session";

import type { Env } from "../env.ts";

export type CustomerSessionManager = WritableCustomerSessionManager;

export type CustomerAccount = {
  client: CustomerAccountClient;
  requestContext: ShopifyRequestContext;
  session: ReturnType<typeof createCustomerSession>;
  sessionManager: CustomerSessionManager;
};

/**
 * Adapts the request's Remix session to Hydrogen's session manager contract. Remix's
 * session middleware commits the cookie on the response, so Hydrogen never needs `commit`.
 */
export function createCustomerSessionManager(
  session: Session,
  origin: string,
): CustomerSessionManager {
  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => session.get(key),
    setSessionItem: (key, value) => session.set(key, value),
    removeSessionItem: (key) => session.unset(key),
  };
}

export function createCustomerAccount({
  env,
  requestContext,
  sessionManager,
}: {
  env: Env;
  requestContext: ShopifyRequestContext;
  sessionManager: CustomerSessionManager;
}): CustomerAccount {
  const shopId = env.SHOP_ID;
  const customerAccountApiClientId = env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID;

  return {
    client: createCustomerAccountClient({ shopId, requestContext }),
    requestContext,
    session: createCustomerSession({ shopId, customerAccountApiClientId }),
    sessionManager,
  };
}
