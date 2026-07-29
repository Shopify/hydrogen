import { customerAccountConfig } from "@shared/config";
import { EncryptedCookieCustomerSession } from "@shared/customer-session";
import { createShopifyRequestContext } from "@shopify/hydrogen";
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

export async function getCustomerAccountPageData({ request }: { request: Request }) {
  const sessionManager = await createCustomerSessionManager(request);
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const requestUrl = new URL(request.url);
  const loginFailed = requestUrl.searchParams.get("login") === "failed";
  const accessToken = await customerSession.getOrRefreshAccessToken(sessionManager, requestContext);
  copyHeaders(await sessionManager.commit?.(), headers);

  if (!accessToken) {
    requestContext.applyResponseHeaders(headers);
    return { customer: null, error: null, loginFailed, headers };
  }

  try {
    const customerAccount = CAAPI.createCustomerAccountClient({
      shopId: customerAccountConfig.shopId,
      requestContext,
    });
    const { data, errors } = await customerAccount.graphql(CUSTOMER_QUERY, { accessToken });
    requestContext.applyResponseHeaders(headers);
    return {
      customer: errors ? null : data.customer,
      error: errors?.[0]?.message ?? null,
      loginFailed,
      headers,
    };
  } catch {
    requestContext.applyResponseHeaders(headers);
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
