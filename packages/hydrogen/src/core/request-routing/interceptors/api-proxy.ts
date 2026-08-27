import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { SHOPIFY_API_PROXY_PREFIX, SHOPIFY_API_PROXY_RE } from "../../url";
import { rewriteShopifyJsPathname } from "./ajax-api";
import { createProxyInterceptor } from "./proxy";

export const handleShopifyApiProxy = createProxyInterceptor({
  match: SHOPIFY_API_PROXY_RE,
  requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  rewritePathname: (pathname) => {
    const upstreamPathname =
      "/" + pathname.slice(SHOPIFY_API_PROXY_PREFIX.length).replace(/^\/+/, "");

    if (upstreamPathname.startsWith("/cdn/")) {
      throw new Error("CDN proxy is not supported.");
    }

    return rewriteShopifyJsPathname(upstreamPathname);
  },
  scope: "shopify-api-proxy",
});
