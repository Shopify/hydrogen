import { handleShopifyRedirects } from "@shopify/hydrogen";
import { notFound, redirect } from "@tanstack/react-router";

import { routeTemplates } from "~/lib/route-templates";

import { storefrontFn, type ShopifyServerContext } from "./storefront-fn";

/**
 * Resolves a missing storefront URL server-side: either a Shopify URL redirect
 * (admin `/admin`, standard-route canonicalisation, `urlRedirects` lookups,
 * query-param redirects) or a 404.
 *
 * Callers pass the storefront pathname/search they were asked for — never the
 * incoming request URL, which during a client-side navigation is the
 * `/_serverFn/*` RPC URL, not the page the shopper is looking at. Data server
 * functions rebuild the path from their validated params (see
 * `~/lib/route-templates`); the catch-all route passes `location.pathname` and
 * `location.searchStr`. Only the request *origin* is trusted.
 *
 * This is a plain function (not a server function) so it can be called from
 * inside other server functions without a second RPC; it must therefore avoid
 * server-only imports, which Start's client build would reject.
 *
 * Only ever throws: a router `redirect()` when Shopify has one, `notFound()`
 * otherwise (including when the URL would resolve off-origin).
 */
export async function throwNotFoundOrRedirect(
  { request, storefrontClient }: Pick<ShopifyServerContext, "request" | "storefrontClient">,
  pathname: string,
  search: string,
): Promise<never> {
  const origin = new URL(request.url).origin;
  const url = new URL(pathname, origin);
  url.search = search;

  if (url.origin !== origin) throw notFound();

  const response = await handleShopifyRedirects({
    request: new Request(url),
    storefrontClient,
    routeTemplates,
  });
  const location = response?.headers.get("location");

  if (response && location) {
    throw redirect({ href: location, statusCode: response.status });
  }

  throw notFound();
}

export const resolveNotFound = storefrontFn
  .validator((input: unknown) => {
    if (
      typeof input !== "object" ||
      input === null ||
      !("pathname" in input) ||
      !("search" in input) ||
      typeof input.pathname !== "string" ||
      typeof input.search !== "string"
    ) {
      throw new Error("resolveNotFound expects { pathname: string; search: string }.");
    }
    return { pathname: input.pathname, search: input.search };
  })
  .handler(({ context, data }) => throwNotFoundOrRedirect(context, data.pathname, data.search));
