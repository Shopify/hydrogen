import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { parseSameOriginUrl } from "../../standard-routes/path";
import { APP_PROXY_PREFIXES, APP_PROXY_RE } from "../../url";
import type { HydrogenRouteInterceptor } from "../route-types";
import { createProxyInterceptor } from "./proxy";

/** Subpath prefixes Shopify allows for app proxies. */
export type AppProxyPrefix = (typeof APP_PROXY_PREFIXES)[number];

export type AppProxyOptions = {
  /**
   * Prefixes to proxy. Defaults to every prefix Shopify allows:
   * `apps`, `a`, `community`, and `tools`. Limit this to the prefixes your
   * installed apps use so unrelated paths keep reaching the framework router.
   */
  prefixes?: readonly AppProxyPrefix[];
};

/**
 * Shopify redirects `*.myshopify.com` app proxy requests to the shop's primary
 * domain (a loop for a headless storefront that *is* that domain). `_fd=0`
 * turns the forward off; it is stripped before the request reaches the app.
 */
const FORWARD_DOMAIN_PARAM = "_fd";

const proxyAppRequest = createProxyInterceptor({
  match: APP_PROXY_RE,
  requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
  rewriteSearch: (searchParams) => searchParams.set(FORWARD_DOMAIN_PARAM, "0"),
  responseHeaders: {
    prepare: (headers, { url, storefrontClient }) => {
      // Apps redirect within their proxy path; keep those on the storefront origin.
      const location = headers.get("location");
      const target = location ? parseSameOriginUrl(location, storefrontClient.storeUrl) : null;
      if (!target) return;
      target.searchParams.delete(FORWARD_DOMAIN_PARAM);
      headers.set("location", `${url.origin}${target.pathname}${target.search}${target.hash}`);
    },
  },
  scope: "app-proxy",
});

function resolvePrefixes(option: boolean | AppProxyOptions): readonly AppProxyPrefix[] {
  if (option === false) return [];
  if (option === true || !option.prefixes) return APP_PROXY_PREFIXES;

  for (const prefix of option.prefixes) {
    if (!APP_PROXY_PREFIXES.includes(prefix)) {
      throw new Error(
        `appProxy: "${prefix}" is not a Shopify app proxy prefix. Expected one of: ${APP_PROXY_PREFIXES.join(", ")}.`,
      );
    }
  }
  return option.prefixes;
}

/**
 * Proxies Shopify app proxy paths to the configured store when
 * `handleShopifyRoutes({ appProxy })` opts in, passing the app's response
 * through unchanged: status, body, `content-type`, `content-disposition`, and
 * redirects. Links Shopify apps already handed to customers, such as Digital
 * Downloads URLs, keep working after a move to Hydrogen.
 */
export const handleAppProxy: HydrogenRouteInterceptor = (url, options) => {
  if (!APP_PROXY_RE.test(url.pathname)) return null;

  const prefix = url.pathname.split("/")[1] ?? "";
  const prefixes = resolvePrefixes(options.appProxy ?? false);
  if (!prefixes.some((enabled) => enabled === prefix)) return null;

  return proxyAppRequest(url, options);
};
