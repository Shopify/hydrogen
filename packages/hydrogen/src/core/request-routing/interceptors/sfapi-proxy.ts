import {
  CONSENT_MANAGEMENT_HEADER,
  SFAPI_REQUEST_HEADER_ALLOWLIST,
  STOREFRONT_BUYER_IP_HEADER,
  STOREFRONT_ID_HEADER,
} from "../../headers";
import { SFAPI_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleSfapiProxy = createProxyInterceptor({
  match: SFAPI_RE,
  requestHeaders: {
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
  responseHeaders: {
    prepare(headers, { request, requestContext, url, response }) {
      if (request.headers.has(CONSENT_MANAGEMENT_HEADER) && response.ok) {
        const cookies = (requestContext.cookie ?? "").split(";");
        const legacyNames = ["_shopify_y", "_shopify_s"].filter((name) =>
          cookies.some((cookie) => cookie.trim().startsWith(`${name}=`)),
        );
        if (legacyNames.length) {
          expireLegacyCookies(headers, legacyNames, url.hostname);
        }
      }
    },
  },
  scope: "sfapi-proxy",
});

function expireLegacyCookies(headers: Headers, legacyNames: string[], hostname: string): void {
  // Cookie requests omit domain attributes. Expire host-only cookies and
  // each possible domain scope used by older storefronts. Browsers reject
  // public suffixes (such as co.uk), so no public suffix list is needed here.
  const domains = [""];
  if (!hostname.includes(":") && !/^[\d.]+$/.test(hostname)) {
    const labels = hostname.split(".");
    while (labels.length > 1) {
      domains.push(labels.join("."));
      labels.shift();
    }
  }

  for (const name of legacyNames) {
    for (const domain of domains) {
      headers.append(
        "set-cookie",
        `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`,
      );
    }
  }
}
