import { AJAX_API_REQUEST_HEADER_ALLOWLIST } from "../headers";
import { AJAX_CART_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleAjaxApi = createProxyInterceptor({
  match: AJAX_CART_RE,
  allowlist: AJAX_API_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({ error: message }),
  logPrefix: "AJAX API proxy",
});
