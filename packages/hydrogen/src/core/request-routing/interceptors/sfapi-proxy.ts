import {
  SFAPI_REQUEST_HEADER_ALLOWLIST,
  SHOPIFY_CLIENT_IP_HEADER,
  STOREFRONT_BUYER_IP_HEADER,
} from "../../headers";
import { SFAPI_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleSfapiProxy = createProxyInterceptor({
  match: SFAPI_RE,
  headers: {
    allow: SFAPI_REQUEST_HEADER_ALLOWLIST,
    prepare: (headers, { requestContext, storefrontClient }) => {
      headers.delete(STOREFRONT_BUYER_IP_HEADER);
      headers.delete(SHOPIFY_CLIENT_IP_HEADER);
      const { buyerIp } = requestContext;
      if (buyerIp) {
        headers.set(STOREFRONT_BUYER_IP_HEADER, buyerIp);
        headers.set(SHOPIFY_CLIENT_IP_HEADER, buyerIp);
        return;
      }
      if (storefrontClient.type === "private") {
        throw new Error(
          "requestContext.buyerIp is required for private Storefront API proxy requests",
        );
      }
    },
  },
  scope: "sfapi-proxy",
});
