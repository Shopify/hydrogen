import { PROXY_REQUEST_HEADER_DENYLIST } from "../../headers";
import { APP_PROXY_PREFIXES, createAppProxyPattern } from "../../url";
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
const FORWARD_DOMAIN_OFF = "0";

// One interceptor per distinct prefix list; the option object may be rebuilt per request.
const interceptorsByPrefixes = new Map<string, HydrogenRouteInterceptor>();

function resolvePrefixes(option: boolean | AppProxyOptions): readonly AppProxyPrefix[] | null {
  if (option === false) return null;
  if (option === true) return APP_PROXY_PREFIXES;

  const prefixes = option.prefixes ?? APP_PROXY_PREFIXES;
  for (const prefix of prefixes) {
    if (!APP_PROXY_PREFIXES.includes(prefix)) {
      throw new Error(
        `appProxy: "${prefix}" is not a Shopify app proxy prefix. Expected one of: ${APP_PROXY_PREFIXES.join(", ")}.`,
      );
    }
  }
  return prefixes.length > 0 ? prefixes : null;
}

function createAppProxyInterceptor(prefixes: readonly AppProxyPrefix[]): HydrogenRouteInterceptor {
  return createProxyInterceptor({
    match: createAppProxyPattern(prefixes),
    requestHeaders: { deny: PROXY_REQUEST_HEADER_DENYLIST },
    rewriteSearch: (searchParams) => searchParams.set(FORWARD_DOMAIN_PARAM, FORWARD_DOMAIN_OFF),
    responseHeaders: {
      prepare: (headers, { url, storefrontClient }) => {
        // Apps redirect within their proxy path; keep those on the storefront origin.
        const location = headers.get("location");
        if (!location) return;
        const target = new URL(location, storefrontClient.storeUrl);
        if (target.origin !== new URL(storefrontClient.storeUrl).origin) return;
        target.searchParams.delete(FORWARD_DOMAIN_PARAM);
        headers.set(
          "location",
          new URL(`${target.pathname}${target.search}${target.hash}`, url.origin).toString(),
        );
      },
    },
    scope: "app-proxy",
  });
}

function getAppProxyInterceptor(prefixes: readonly AppProxyPrefix[]): HydrogenRouteInterceptor {
  const key = prefixes.join(",");
  let interceptor = interceptorsByPrefixes.get(key);
  if (!interceptor) {
    interceptor = createAppProxyInterceptor(prefixes);
    interceptorsByPrefixes.set(key, interceptor);
  }
  return interceptor;
}

/**
 * Proxies Shopify app proxy paths to the configured store when
 * `handleShopifyRoutes({ appProxy })` opts in, passing the app's response
 * through unchanged: status, body, `content-type`, `content-disposition`, and
 * redirects. Links Shopify apps already handed to customers, such as Digital
 * Downloads URLs, keep working after a move to Hydrogen.
 */
export const handleAppProxy: HydrogenRouteInterceptor = (url, options) => {
  const prefixes = resolvePrefixes(options.appProxy ?? false);
  if (!prefixes) return null;

  return getAppProxyInterceptor(prefixes)(url, options);
};
