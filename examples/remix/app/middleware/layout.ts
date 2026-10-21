import { createContextKey, type Middleware } from "remix/router";

import { loadLayout, type Layout } from "../lib/layout.ts";
import { requireContext } from "./context.ts";
import { LocaleContext } from "./locale.ts";
import { RuntimeContext } from "./runtime.ts";
import { ShopifyContext } from "./shopify.ts";

/** Resolves the document shell's data. Repeated calls share one request. */
export type LoadLayout = () => Promise<Layout>;

export const LayoutContext = createContextKey<LoadLayout>();

/**
 * Starts loading the shell (menus, cart, login state) as soon as an HTML request
 * reaches the router, so it runs in parallel with the route's own queries. The
 * renderer awaits it; non-HTML routes such as `robots.txt` and fragments never start it.
 */
export function layout(): Middleware<{ key: typeof LayoutContext; value: LoadLayout }> {
  return (context, next) => {
    let promise: Promise<Layout> | undefined;
    const load: LoadLayout = () => {
      promise ??= loadLayout({
        env: requireContext(context, RuntimeContext, "runtime").env,
        locale: context.get(LocaleContext),
        request: context.request,
        shopify: requireContext(context, ShopifyContext, "shopify"),
      });
      return promise;
    };

    // Remix's renderer marks the subrequests it makes to resolve a page's `<Frame>`s.
    // Those render fragments without the shell, so they don't start loading it.
    const isFrameSubrequest = context.headers.has("X-Remix-Top-Frame-Src");
    const isPageRequest =
      context.method === "GET" &&
      context.headers.get("Accept")?.includes("text/html") &&
      !isFrameSubrequest;
    if (isPageRequest) {
      // Errors surface when the renderer awaits the promise.
      load().catch(() => {});
    }

    context.set(LayoutContext, load);
    return next();
  };
}
