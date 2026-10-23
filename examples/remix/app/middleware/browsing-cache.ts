import { createContextKey, type Middleware, type RequestContext } from "remix/router";

import { BROWSING } from "../lib/cache-control.ts";

const BrowsingCacheContext = createContextKey<boolean>();

/** Cart cookies, the session cookie, and Remix's frame headers change the rendered page. */
const BROWSING_VARY = "Cookie, X-Remix-Frame, X-Remix-Target, X-Remix-Top-Frame-Src";

/** Marks the request's page as one a client navigation may reuse. The renderer calls it. */
export function allowBrowsingCache(context: Pick<RequestContext, "set">): void {
  context.set(BrowsingCacheContext, true);
}

/**
 * Lets the browser keep an opted-in page's client navigation response for 5 seconds, so the
 * click after an intent prefetch (`data-rmx-prefetch`) reuses the prefetched page.
 *
 * It runs outside `shopifyResponseHeaders()`, which sends every shell response as
 * `private, no-store` because the header reads the customer's login state. The response
 * stays private and varies by cookie, so signing in or out, or getting a new cart cookie,
 * misses the cached copy.
 *
 * Only client navigations qualify. Full documents seed the browser's cart store, so they stay
 * uncacheable. A client navigation renders into a document whose cart store already exists:
 * once it holds a cart, it ignores the response's embedded cart, and the response that creates
 * a cart sets a new cart cookie, which misses any copy cached before it. So a cached page can't
 * show a stale cart.
 */
export function browsingCache(): Middleware {
  return async (context, next) => {
    const response = await next();
    if (!context.get(BrowsingCacheContext) || !isReusable(context.request, response)) {
      return response;
    }

    response.headers.set("Cache-Control", BROWSING);
    response.headers.append("Vary", BROWSING_VARY);
    return response;
  };
}

function isReusable(request: Request, response: Response): boolean {
  return (
    request.method === "GET" &&
    request.headers.get("X-Remix-Frame") === "true" &&
    response.status === 200 &&
    !response.headers.has("Set-Cookie") &&
    (response.headers.get("Content-Type")?.startsWith("text/html") ?? false)
  );
}
