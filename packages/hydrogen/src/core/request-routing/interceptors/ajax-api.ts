import { AJAX_API_REQUEST_HEADER_ALLOWLIST } from "../../headers";
import { AJAX_CART_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleAjaxApi = createProxyInterceptor({
  match: AJAX_CART_RE,
  headers: { allow: AJAX_API_REQUEST_HEADER_ALLOWLIST },
  // Known workaround for buggy Shopify server redirects on the `.js` cart endpoint.
  rewritePathname: (pathname) => pathname.replace(/\/cart\.js$/i, "/cart.json"),
  scope: "ajax-api",
});
