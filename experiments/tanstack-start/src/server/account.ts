import { getCustomerAccountPageData } from "./customer-account";
import { storefrontFn } from "./storefront-fn";
import { searchInput } from "./validators";

// Touches the customer session (read + possible token refresh), which marks
// the response personalized (`private, no-store`) and dirties the session
// cookie. Must run inside the loader, never deferred, so the global middleware
// commits both before headers flush.
export const getAccount = storefrontFn.validator(searchInput).handler(({ context, data }) => {
  const { requestContext, sessionManager, customerAccountClient } = context;

  return getCustomerAccountPageData({
    // The Customer Account handlers redirect to `/account?login=failed` when
    // OAuth does not complete; read it from the route search, not the RPC URL.
    loginFailed: new URLSearchParams(data.search).get("login") === "failed",
    requestContext,
    sessionManager,
    customerAccount: customerAccountClient,
  });
});
