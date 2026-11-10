import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { SHOPIFY_API_PROXY_PREFIX, SHOPIFY_API_PROXY_RE } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";
import { rewriteShopifyJsPathname } from "./ajax-api";
import { createProxyInterceptor } from "./proxy";

const SHOPIFY_API_PROXY_ROOT_RE = /^\/__shopify\/*$/;

const proxyShopifyApiRequest = createProxyInterceptor({
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

export const handleShopifyApiProxy: HydrogenRouteInterceptor = (url, options) => {
  // The bare prefix would proxy the Online Store home page, which redirects off the storefront.
  if (SHOPIFY_API_PROXY_ROOT_RE.test(url.pathname)) {
    return Promise.resolve(
      new Response(
        options.request.method === "HEAD" ? null : JSON.stringify({ error: "Not Found" }),
        { status: 404, headers: { "content-type": "application/json" } },
      ),
    );
  }

  return proxyShopifyApiRequest(url, options);
};
