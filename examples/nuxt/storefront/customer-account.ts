import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import type { ShopifyRequestContext } from "@shopify/hydrogen";
import * as CAAPI from "@shopify/hydrogen/customer-account";

const ACCOUNT_PATH = "/account";
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
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const requestUrl = new URL(request.url);
  const loginFailed = requestUrl.searchParams.get("login") === "failed";
  const accessToken = await customerSession.getOrRefreshAccessToken(sessionManager, requestContext);
  copyHeaders(await sessionManager.commit?.(), headers);

  if (!accessToken) return { customer: null, error: null, loginFailed, headers };

  try {
    const { data, errors } = await customerAccount.graphql(CUSTOMER_QUERY, { accessToken });
    return {
      customer: errors ? null : data.customer,
      error: errors?.[0]?.message ?? null,
      loginFailed,
      headers,
    };
  } catch {
    return {
      customer: null,
      error: "Customer Account API request failed. Try again later.",
      loginFailed,
      headers,
    };
  }
}

function copyHeaders(source: HeadersInit | void, target: Headers) {
  if (!source) return;
  new Headers(source).forEach((value, key) => target.append(key, value));
}
