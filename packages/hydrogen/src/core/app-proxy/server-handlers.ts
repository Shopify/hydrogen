import { PROXY_REQUEST_HEADER_DENYLIST } from "../headers";
import { createProxyInterceptor } from "../request-routing/interceptors/proxy";
import { ANY_METHOD, createCallableRouteHandler } from "../request-routing/registered-routes";
import type {
  CallableRouteHandler,
  ShopifyRouteHandlerContext,
  ShopifyRouteResponseResult,
} from "../request-routing/route-types";
import { parseSameOriginUrl } from "../standard-routes/path";
import { APP_PROXY_PREFIXES } from "../url";

/** Subpath prefixes Shopify allows for app proxies. */
export type AppProxyPrefix = (typeof APP_PROXY_PREFIXES)[number];

export type CreateAppProxyServerHandlersOptions = {
  /**
   * Prefixes to proxy. Defaults to every prefix Shopify allows:
   * `apps`, `a`, `community`, and `tools`. Limit this to the prefixes your
   * installed apps use so unrelated paths keep reaching the framework router.
   */
  prefixes?: readonly AppProxyPrefix[];
};

type AppProxyHandlerContext = Pick<
  ShopifyRouteHandlerContext,
  "request" | "requestContext" | "sessionManager" | "storefrontClient"
>;

type AppProxyHandler = CallableRouteHandler<
  AppProxyHandlerContext,
  ShopifyRouteResponseResult,
  `/${AppProxyPrefix}/*`,
  typeof ANY_METHOD
>;

/** One any-method handler per proxied prefix, keyed by prefix. */
export type AppProxyServerHandlers = Record<string, AppProxyHandler>;

/**
 * Shopify redirects `*.myshopify.com` app proxy requests to the shop's primary
 * domain (a loop for a headless storefront that *is* that domain). `_fd=0`
 * turns the forward off; it is stripped before the request reaches the app.
 */
const FORWARD_DOMAIN_PARAM = "_fd";

const proxyAppRequest = createProxyInterceptor({
  // Handlers own the route match; the interceptor's own guard always passes.
  match: /^\//,
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

async function handleAppProxyRequest(
  context: AppProxyHandlerContext,
): Promise<ShopifyRouteResponseResult> {
  const response = await proxyAppRequest(new URL(context.request.url), context);
  if (!response) throw new Error("app proxy: request did not match the proxy interceptor.");
  return { type: "response", response };
}

/**
 * Creates request handlers that proxy Shopify app proxy paths (`/apps/*`,
 * `/a/*`, `/community/*`, `/tools/*`) to the configured store, so pages and
 * endpoints served by installed apps, such as Digital Downloads links already
 * in customers' inboxes, keep working on the headless storefront.
 *
 * Register the returned group with `handleShopifyRoutes({ handlers })`. Every
 * method is proxied and the app's response passes through unchanged: status,
 * body, `content-type`, `content-disposition`, and redirects. Hydrogen sends
 * `_fd=0` upstream so Shopify does not redirect back to the primary domain,
 * and rewrites store-origin redirects onto the storefront origin. Handlers
 * registered at a literal pathname under a proxied prefix still win.
 *
 * @example
 * ```ts
 * const appProxyHandlers = createAppProxyServerHandlers({ prefixes: ["a"] });
 *
 * handleShopifyRoutes({ request, requestContext, sessionManager, storefrontClient, handlers: [cartHandlers, appProxyHandlers] });
 * ```
 */
export function createAppProxyServerHandlers(
  options: CreateAppProxyServerHandlersOptions = {},
): AppProxyServerHandlers {
  const prefixes = options.prefixes ?? APP_PROXY_PREFIXES;
  for (const prefix of prefixes) {
    if (!APP_PROXY_PREFIXES.includes(prefix)) {
      throw new Error(
        `createAppProxyServerHandlers: "${prefix}" is not a Shopify app proxy prefix. Expected one of: ${APP_PROXY_PREFIXES.join(", ")}.`,
      );
    }
  }

  // A fresh function per prefix: the route metadata is attached to the callable itself.
  return Object.fromEntries(
    prefixes.map((prefix) => [
      prefix,
      createCallableRouteHandler(`/${prefix}/*`, ANY_METHOD, (context: AppProxyHandlerContext) =>
        handleAppProxyRequest(context),
      ),
    ]),
  );
}
