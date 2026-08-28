import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { WELL_KNOWN_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

/**
 * Serves allowlisted Shopify well-known resources from the headless storefront
 * origin so services can verify the customer-facing hostname.
 */
export const handleWellKnownProxy = createProxyInterceptor({
  match: WELL_KNOWN_RE,
  requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  redirect: "follow",
  scope: "well-known-proxy",
});
