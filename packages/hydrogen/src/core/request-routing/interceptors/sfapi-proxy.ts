import {
  SFAPI_REQUEST_HEADER_ALLOWLIST,
  SERVER_TIMING_HEADER,
  STOREFRONT_BUYER_IP_HEADER,
  STOREFRONT_ID_HEADER,
} from "../../headers";
import { SFAPI_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleSfapiProxy = createProxyInterceptor({
  match: SFAPI_RE,
  headers: {
    allow: SFAPI_REQUEST_HEADER_ALLOWLIST,
    prepare: (headers, { requestContext, storefrontClient }) => {
      headers.delete(STOREFRONT_ID_HEADER);
      if (storefrontClient.storefrontId) {
        headers.set(STOREFRONT_ID_HEADER, storefrontClient.storefrontId);
      }

      headers.delete(STOREFRONT_BUYER_IP_HEADER);
      const { buyerIp } = requestContext;
      if (buyerIp) {
        headers.set(STOREFRONT_BUYER_IP_HEADER, buyerIp);
        return;
      }
      if (storefrontClient.type === "private") {
        throw new Error(
          "requestContext.buyerIp is required for private Storefront API proxy requests",
        );
      }
    },
  },
  prepareResponseHeaders: (headers, { requestContext }) => {
    // Route upstream state through the request-context gate instead of returning
    // it directly from proxy responses.
    requestContext.captureSubrequestHeaders(headers);
    headers.delete(SERVER_TIMING_HEADER);
  },
  scope: "sfapi-proxy",
});
