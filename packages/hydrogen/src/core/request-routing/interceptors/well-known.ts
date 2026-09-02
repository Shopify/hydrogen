import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { WELL_KNOWN_RE } from "../../url";
import { createProxyInterceptor } from "./proxy";

/**
 * Proxies allowlisted Shopify `.well-known` resources through the headless
 * storefront origin to the Online Store, so first-party services (Apple Pay
 * domain verification, Frontend Event Collector ingress) behave the same way
 * they do on Online Store storefronts. See {@link WELL_KNOWN_RE} for the
 * allowlist.
 */
export const handleWellKnownProxy = createProxyInterceptor({
  match: WELL_KNOWN_RE,
  requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  redirect: "follow",
  scope: "well-known-proxy",
});
