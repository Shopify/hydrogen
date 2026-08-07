import { AJAX_API_REQUEST_HEADER_ALLOWLIST } from "../../headers";
import { AJAX_CART_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

export const handleAjaxApi = createProxyInterceptor({
  match: AJAX_CART_RE,
  headers: { allow: AJAX_API_REQUEST_HEADER_ALLOWLIST },
  scope: "ajax-api",
});
