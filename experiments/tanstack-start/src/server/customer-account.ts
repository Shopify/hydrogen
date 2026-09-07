import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import * as CAAPI from "@shopify/hydrogen/customer-account";

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

export function createCustomerSessionManager(request: Request) {
  return EncryptedCookieCustomerSession.init(request, customerAccountConfig.sessionSecret);
}

export function createRequestCustomerAccountClient(requestContext: ShopifyRequestContext) {
  return CAAPI.createCustomerAccountClient({
    shopId: customerAccountConfig.shopId,
    requestContext,
  });
}

type CustomerAccountPageDataOptions = {
  loginFailed: boolean;
  requestContext: ShopifyRequestContext;
  sessionManager: CAAPI.WritableCustomerSessionManager;
  customerAccount: CAAPI.CustomerAccountClient;
};

export async function getCustomerAccountPageData({
  loginFailed,
  requestContext,
  sessionManager,
  customerAccount,
}: CustomerAccountPageDataOptions) {
  // Refreshes an expired token and writes it back to the session; the global
  // request middleware commits the session cookie after `next()`, which is why
  // this server fn must never be deferred.
  const accessToken = await customerSession.getOrRefreshAccessToken(sessionManager, requestContext);

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
