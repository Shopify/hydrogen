import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerAccountServerHandlers,
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { createContext } from "react-router";

import { EncryptedCookieCustomerSession } from "./customer-session";
import type { CustomerAccountConfig } from "./shop";

export type CustomerAccountRequestContext =
  | { available: false }
  | {
      available: true;
      client: CustomerAccountClient;
      requestContext: ShopifyRequestContext;
      session: CustomerSession;
      sessionManager: WritableCustomerSessionManager;
    };

export const customerAccountContext = createContext<CustomerAccountRequestContext>();
const customerSessions = new Map<string, CustomerSession>();

export function createCustomerAccountRequestContext(
  requestContext: ShopifyRequestContext,
  config: CustomerAccountConfig,
  sessionManager: WritableCustomerSessionManager,
): Extract<CustomerAccountRequestContext, { available: true }> {
  const session = getCustomerSession(config);

  return {
    available: true,
    client: createCustomerAccountClient({ shopId: config.shopId, requestContext }),
    requestContext,
    session,
    sessionManager,
  };
}

export function createCustomerSessionManager(request: Request, sessionSecret: string) {
  return EncryptedCookieCustomerSession.init(request, sessionSecret);
}

function getCustomerSession(config: CustomerAccountConfig): CustomerSession {
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

export function createCustomerAccountHandlers(
  customerAccount: Extract<CustomerAccountRequestContext, { available: true }>,
) {
  return createCustomerAccountServerHandlers({
    customerSession: customerAccount.session,
    defaultPostLoginRedirectPathname: "/account",
    loginFailedRedirectPath: "/account?login=failed",
    postLogoutRedirectUri: "/",
  });
}
