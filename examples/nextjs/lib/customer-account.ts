import "server-only";
import { createShopifyRequestContext } from "@shopify/hydrogen";
import { createCustomerSession } from "@shopify/hydrogen/customer-account";
import { headers } from "next/headers";

import { customerAccountConfig, defaultI18n } from "./config";
import { EncryptedCookieCustomerSession } from "./customer-session";
import { getSessionSecret } from "./env";
import { SITE_ORIGIN } from "./site";
import { isCustomerAccountsAvailable } from "./storefront-config";

let customerSession: ReturnType<typeof createCustomerSession> | undefined;

export function getCustomerSession() {
  if (!isCustomerAccountsAvailable()) {
    throw new Error(
      "Customer Accounts require NEXT_PUBLIC_SHOP_ID, NEXT_PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID, SESSION_SECRET, and SITE_ORIGIN.",
    );
  }

  return (customerSession ??= createCustomerSession({
    shopId: customerAccountConfig.shopId,
    customerAccountApiClientId: customerAccountConfig.customerAccountApiClientId,
  }));
}

export async function createCustomerSessionManager(request: Request) {
  return EncryptedCookieCustomerSession.init(request, getSessionSecret());
}

export function createEphemeralSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

export async function createCurrentRequest(pathname = "/account") {
  const requestHeaders = await headers();
  return new Request(new URL(pathname, SITE_ORIGIN), { headers: requestHeaders });
}

export async function isCustomerLoggedIn() {
  if (!isCustomerAccountsAvailable()) return false;
  const { requestContext, sessionManager } = await createCustomerRequestContext();
  return getCustomerSession().isLoggedIn(sessionManager, requestContext);
}

export async function getCustomerAccessToken() {
  const { requestContext, sessionManager } = await createCustomerRequestContext();
  return {
    accessToken: await getCustomerSession().getAccessToken(sessionManager, requestContext),
    requestContext,
  };
}

async function createCustomerRequestContext(pathname = "/account") {
  const request = await createCurrentRequest(pathname);
  return {
    request,
    requestContext: createShopifyRequestContext({ request, i18n: defaultI18n }),
    sessionManager: await createCustomerSessionManager(request),
  };
}
