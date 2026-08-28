import { AJAX_API_REQUEST_HEADER_ALLOWLIST } from "../../headers";
import { AJAX_CART_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

// Known workaround for Shopify server redirects on `.js` endpoints.
export const rewriteShopifyJsPathname = (pathname: string): string =>
  pathname.replace(/\.js$/i, ".json");

export const handleAjaxApi = createProxyInterceptor({
  match: AJAX_CART_RE,
  requestHeaders: { allow: AJAX_API_REQUEST_HEADER_ALLOWLIST },
  rewritePathname: rewriteShopifyJsPathname,
  scope: "ajax-api",
});
