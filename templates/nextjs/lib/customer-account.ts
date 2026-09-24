import "server-only";
import { createShopifyRequestContext } from "@shopify/hydrogen";
import { createCustomerSession } from "@shopify/hydrogen/customer-account";
import { headers } from "next/headers";

import { customerAccountConfig, i18n } from "./config";
import { EncryptedCookieCustomerSession } from "./customer-session";
import { getSessionSecret } from "./env";
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

/**
 * Server Component read context. Built from `headers()` only, like `lib/storefront.ts`: the
 * forwarded `x-storefront-url` (set by `proxy.ts`) drives `requestContext.url` and the locale.
 * A synthetic `Request` with a fixed origin would win over that header and pin every RSC account
 * read to the default locale.
 */
async function createCustomerRequestContext() {
  const requestHeaders = await headers();
  return {
    requestContext: createShopifyRequestContext({ request: { headers: requestHeaders }, i18n }),
    sessionManager: await EncryptedCookieCustomerSession.read(requestHeaders, getSessionSecret()),
  };
}
