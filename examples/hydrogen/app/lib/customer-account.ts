import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { redirect } from "react-router";

type CustomerAccountConfig = {
  shopId: string;
  customerAccountApiClientId: string;
  customerAccountApiUrl?: string;
};
const CUSTOMER_ACCOUNT_HANDLER_PATHS = new Set([
  "/account/authorize",
  "/account/login",
  "/account/logout",
  "/account/refresh",
]);
const LOCALE_PATH_PREFIX_RE = /^\/[A-Za-z]{2}-[A-Za-z]{2}(?=\/)/;
export type CustomerAccountContext = {
  client: CustomerAccountClient;
  requestContext: ShopifyRequestContext;
  session: CustomerSession;
  sessionManager: WritableCustomerSessionManager;
};

export async function createCustomerSessionManager(request: Request, sessionSecret: string) {
  return EncryptedCookieCustomerSession.init(request, sessionSecret);
}

export function createCustomerAccountContext({
  config,
  requestContext,
  sessionManager,
}: {
  config: CustomerAccountConfig;
  requestContext: ShopifyRequestContext;
  sessionManager: WritableCustomerSessionManager;
}): CustomerAccountContext {
  const session = createCustomerSession({
    shopId: config.shopId,
    customerAccountApiClientId: config.customerAccountApiClientId,
    customerAccountApiUrl: config.customerAccountApiUrl,
  });

  return {
    client: createCustomerAccountClient({
      shopId: config.shopId,
      requestContext,
    }),
    requestContext,
    session,
    sessionManager,
  };
}

export async function getCustomerAccessToken(customerAccount: CustomerAccountContext) {
  return customerAccount.session.getOrRefreshAccessToken(
    customerAccount.sessionManager,
    customerAccount.requestContext,
  );
}

export async function requireCustomerAccessToken(
  request: Request,
  customerAccount: CustomerAccountContext,
) {
  const accessToken = await getCustomerAccessToken(customerAccount);
  if (accessToken) return accessToken;

  throw redirect(getLoginPath(request));
}

export async function isSameOriginRequest(
  request: Request,
  sessionManager: WritableCustomerSessionManager,
) {
  const trustedOrigin = await sessionManager.getSessionOrigin();
  const origin = request.headers.get("origin");

  if (origin) return isSameOrigin(origin, trustedOrigin);

  const referer = request.headers.get("referer");
  if (!referer) return false;

  return isSameOrigin(referer, trustedOrigin);
}

function getLoginPath(request: Request) {
  const requestUrl = new URL(request.url);
  const localePathPrefix = requestUrl.pathname.match(LOCALE_PATH_PREFIX_RE)?.[0] ?? "";
  const unlocalizedPathname = requestUrl.pathname.slice(localePathPrefix.length) || "/";
  const returnTo = CUSTOMER_ACCOUNT_HANDLER_PATHS.has(unlocalizedPathname)
    ? `${localePathPrefix}/account`
    : `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
  const loginUrl = new URL("/account/login", requestUrl.origin);
  loginUrl.searchParams.set("return_to", returnTo);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

function isSameOrigin(candidateOrigin: string, trustedOrigin: string) {
  try {
    return new URL(candidateOrigin).origin === new URL(trustedOrigin).origin;
  } catch {
    return false;
  }
}
