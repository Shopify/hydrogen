import "server-only";
import { customerAccountConfig, defaultI18n } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import { createShopifyRequestContext } from "@shopify/hydrogen";
import { createCustomerSession } from "@shopify/hydrogen/customer-account";
import { headers } from "next/headers";

import { isCustomerAccountsAvailable } from "./storefront-config";

const DEFAULT_REQUEST_ORIGIN = "https://example.com";

export const customerSession = createCustomerSession({
  shopId: customerAccountConfig.shopId,
  customerAccountApiClientId: customerAccountConfig.customerAccountApiClientId,
});

export async function createCustomerSessionManager(request: Request) {
  return EncryptedCookieCustomerSession.init(request, customerAccountConfig.sessionSecret);
}

// Reconstruct a Request from next/headers (App Router doesn't hand you one).
export async function createCurrentRequest(pathname = "/account") {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    return new Request(`${DEFAULT_REQUEST_ORIGIN}${pathname}`, { headers: requestHeaders });
  }
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return new Request(`${protocol}://${host}${pathname}`, { headers: requestHeaders });
}

export async function isCustomerLoggedIn() {
  if (!isCustomerAccountsAvailable()) return false;
  const { requestContext, sessionManager } = await createCustomerRequestContext();
  return customerSession.isLoggedIn(sessionManager, requestContext);
}

export async function getCustomerAccessToken() {
  const { requestContext, sessionManager } = await createCustomerRequestContext();
  return {
    accessToken: await customerSession.getAccessToken(sessionManager, requestContext),
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
