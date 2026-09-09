import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import * as CAAPI from "@shopify/hydrogen/customer-account";
import { getRequestEvent } from "solid-js/web";

export const ACCOUNT_PATH = "/account";
const CUSTOMER_QUERY = CAAPI.gql(`
  query CurrentCustomer {
    customer {
      firstName
      lastName
      emailAddress {
        emailAddress
      }
    }
  }
`);

export const customerSession = CAAPI.createCustomerSession({
  shopId: customerAccountConfig.shopId,
  customerAccountApiClientId: customerAccountConfig.customerAccountApiClientId,
});

export const customerSessionHandlers = CAAPI.createCustomerAccountServerHandlers({
  customerSession,
  defaultPostLoginRedirectPathname: ACCOUNT_PATH,
  postLogoutRedirectUri: "/",
});

export async function createCustomerSessionManager(request: Request) {
  return EncryptedCookieCustomerSession.init(request, customerAccountConfig.sessionSecret);
}

export function createRequestCustomerAccountClient(
  requestContext: Parameters<typeof CAAPI.createCustomerAccountClient>[0]["requestContext"],
) {
  return CAAPI.createCustomerAccountClient({
    shopId: customerAccountConfig.shopId,
    requestContext,
  });
}

export function getRequestCustomerAccountContext() {
  const event = getRequestEvent();
  const { customerAccountClient, customerSessionManager, shopifyRequestContext } =
    event?.locals ?? {};

  if (!customerAccountClient || !customerSessionManager || !shopifyRequestContext) {
    throw new Error("Customer Account context was not created for this server request.");
  }

  return { customerAccountClient, customerSessionManager, shopifyRequestContext };
}

export type CustomerAccountLocals = {
  customerAccountClient: CAAPI.CustomerAccountClient;
  customerSessionManager: CAAPI.WritableCustomerSessionManager;
  shopifyRequestContext: ShopifyRequestContext;
};

type CustomerAccountPageDataOptions = {
  request: Request;
  requestContext: ShopifyRequestContext;
  sessionManager: CAAPI.WritableCustomerSessionManager;
  customerAccount: CAAPI.CustomerAccountClient;
};

export async function getCustomerAccountPageData({
  request,
  requestContext,
  sessionManager,
  customerAccount,
}: CustomerAccountPageDataOptions) {
  const requestUrl = new URL(request.url);
  const loginFailed = requestUrl.searchParams.get("login") === "failed";
  const accessToken = await customerSession.getAccessToken(sessionManager, requestContext);

  if (!accessToken) return { customer: null, error: null, loginFailed };

  try {
    const { data, errors } = await customerAccount.graphql(CUSTOMER_QUERY, { accessToken });
    return {
      customer: errors ? null : data.customer,
      error: errors?.[0]?.message ?? null,
      loginFailed,
    };
  } catch {
    return {
      customer: null,
      error: "Customer Account API request failed. Try again later.",
      loginFailed,
    };
  }
}
