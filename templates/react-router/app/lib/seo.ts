import {
  createRobotsTxtServerHandlers,
  createSitemapServerHandlers,
  getCanonicalUrl,
} from "@shopify/hydrogen";

import { routeTemplates } from "~/lib/route-templates";

/**
 * SEO request handlers (`hydrogen-seo` skill). Registered with
 * `handleShopifyRoutes` in `root.tsx`, so `/sitemap.xml`, `/sitemap/:type/:page.xml`,
 * and `/robots.txt` are served before framework routing. URLs follow the same
 * `routeTemplates` the rest of the app uses. Set `PUBLIC_SITE_ORIGIN` in
 * production so `<loc>` and `Sitemap:` never derive from request headers.
 */
export function createSeoHandlers(env: { PUBLIC_SITE_ORIGIN?: string }) {
  const origin = env.PUBLIC_SITE_ORIGIN || undefined;
  return [
    createSitemapServerHandlers({ origin, routeTemplates, staticPaths: ["/", "/collections"] }),
    createRobotsTxtServerHandlers({ origin, routeTemplates }),
  ];
}

/**
 * Canonical URL for a route `meta()` function. Drops variant, filter, sort,
 * cursor, and tracking params so every page has one canonical URL (F10).
 */
export function canonicalLink(
  origin: string,
  location: { pathname: string; search: string },
  keepSearchParams: readonly string[] = [],
) {
  return {
    tagName: "link" as const,
    rel: "canonical",
    href: getCanonicalUrl(new URL(`${location.pathname}${location.search}`, origin), {
      keepSearchParams,
    }),
  };
}
