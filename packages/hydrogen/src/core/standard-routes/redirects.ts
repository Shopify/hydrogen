import { buildStandardRouteTarget } from "./build";
import { DEFAULT_STANDARD_ROUTES } from "./defaults";
import { matchStandardRouteTemplates } from "./match";
import { isAbsoluteUrl, parseSameOriginUrl, stripTrailingSlash } from "./path";
import type { ShopifyRouteTemplates } from "./types";

/**
 * Returns the custom route target for a Shopify standard route pathname.
 *
 * This is used by server redirects: it only matches Shopify's default route shape when the app
 * configured a custom template for that same resource, so standard `/products/...` requests do not
 * redirect unless the app opted into a non-standard product route.
 */
export function getStandardRouteTarget({
  pathname,
  pathPrefix,
  routeTemplates,
}: {
  pathname: string;
  pathPrefix?: string;
  routeTemplates: ShopifyRouteTemplates;
}): string | null {
  const match = matchStandardRouteTemplates(pathname, pathPrefix, (route) =>
    routeTemplates[route] ? [DEFAULT_STANDARD_ROUTES[route]] : [],
  );

  if (!match) return null;

  const target = routeTemplates[match.route];
  if (!target) return null;

  return buildStandardRouteTarget(target, match.params, pathPrefix);
}

/**
 * Resolves a Shopify standard resource URL to the app's configured route template.
 *
 * Query strings and hashes are preserved. Absolute URLs are only resolved when they share the same
 * origin as `baseUrl`; external URLs are returned unchanged.
 */
export function resolveStandardRouteUrl({
  baseUrl,
  pathPrefix,
  routeTemplates,
  url,
}: {
  baseUrl?: string;
  pathPrefix?: string;
  routeTemplates: ShopifyRouteTemplates;
  url: string;
}): string {
  const parsedUrl = parseSameOriginUrl(url, baseUrl);
  if (!parsedUrl) return url;

  const target = getStandardRouteTarget({
    pathname: parsedUrl.pathname,
    pathPrefix,
    routeTemplates,
  });

  if (!target) return url;

  const resolvedUrl = `${target}${parsedUrl.search}${parsedUrl.hash}`;

  return isAbsoluteUrl(url) ? `${parsedUrl.origin}${resolvedUrl}` : resolvedUrl;
}

export function isStandardRouteSelfRedirect(requestUrl: string, location: string): boolean {
  try {
    const sourceUrl = new URL(requestUrl);
    const targetUrl = new URL(location, sourceUrl.origin);

    return (
      sourceUrl.origin === targetUrl.origin &&
      stripTrailingSlash(sourceUrl.pathname) === stripTrailingSlash(targetUrl.pathname) &&
      sourceUrl.search === targetUrl.search
    );
  } catch {
    return false;
  }
}
