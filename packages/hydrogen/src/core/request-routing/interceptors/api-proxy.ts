import { SHOPIFY_API_PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { SHOPIFY_API_PROXY_PREFIX, SHOPIFY_API_PROXY_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleShopifyApiProxy = createProxyInterceptor({
  match: SHOPIFY_API_PROXY_RE,
  headers: { deny: SHOPIFY_API_PROXY_REQUEST_HEADER_DENYLIST },
  rewritePathname: (pathname) => {
    const upstreamPathname = `/${pathname
      .slice(SHOPIFY_API_PROXY_PREFIX.length)
      .replace(/^\/+/, "")}`;

    // Known workaround for buggy Shopify server redirects on the `.js` cart endpoint.
    return upstreamPathname.replace(/\/cart\.js$/i, "/cart.json");
  },
  scope: "shopify-api-proxy",
});
