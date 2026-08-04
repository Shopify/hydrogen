import { SFAPI_REQUEST_HEADER_ALLOWLIST, STOREFRONT_BUYER_IP_HEADER } from "../headers";
import { SFAPI_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleSfapiProxy = createProxyInterceptor({
  match: SFAPI_RE,
  allowlist: SFAPI_REQUEST_HEADER_ALLOWLIST,
  prepareHeaders: (headers, { requestContext, storefrontClient }) => {
    headers.delete(STOREFRONT_BUYER_IP_HEADER);
    const { buyerIp } = requestContext;
    if (buyerIp) {
      headers.set(STOREFRONT_BUYER_IP_HEADER, buyerIp);
    } else if (storefrontClient.type === "private") {
      throw new Error(
        "requestContext.buyerIp is required for private Storefront API proxy requests",
      );
    }
  },
  formatError: (message) => ({ error: message }),
  logPrefix: "SFAPI proxy",
});
