import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerSession,
  type CustomerAccountClient,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { redirect } from "remix/response/redirect";
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

/**
 * Returns a usable Customer Account access token, refreshing it when needed. Without
 * one, throws a redirect to the login handler so account routes stay unreachable.
 */
export async function requireCustomerAccessToken(
  customerAccount: CustomerAccount,
  request: Request,
  pathPrefix: string,
): Promise<string> {
  const accessToken = await customerAccount.session.getOrRefreshAccessToken(
    customerAccount.sessionManager,
    customerAccount.requestContext,
  );
  if (accessToken) return accessToken;

  const url = new URL(request.url);
  const loginUrl = new URL("/account/login", url.origin);
  loginUrl.searchParams.set("return_to", `${url.pathname}${url.search}`);
  throw redirect(`${pathPrefix}${loginUrl.pathname}${loginUrl.search}`);
}
