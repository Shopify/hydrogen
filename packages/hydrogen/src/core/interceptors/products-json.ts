import type { HydrogenRoutesOptions } from "../handle-shopify-routes";
import { AJAX_API_REQUEST_HEADER_ALLOWLIST } from "../headers";
import { createProxyInterceptor } from "./proxy";

const proxyProductsJson = createProxyInterceptor({
  match: /^\/products\.json$/,
  allowlist: AJAX_API_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({ error: message }),
  scope: "products-json",
});

export function handleProductsJson(options: HydrogenRoutesOptions): Promise<Response | null> {
  if (options.request.method !== "GET") return Promise.resolve(null);
  return proxyProductsJson(options);
}
