import {
  createRobotsTxtServerHandlers,
  createSitemapServerHandlers,
  getCanonicalUrl,
} from "@shopify/hydrogen";

import type { Env } from "~/lib/env";
import { routeTemplates } from "~/lib/route-templates";

/**
 * Trusted public origin for canonical URLs, sitemap `<loc>` entries, and
 * robots.txt. `PUBLIC_SITE_ORIGIN` wins so production never derives it from
 * `Host` headers (F6); the request origin is the development fallback.
 */
export function getSiteOrigin(env: Pick<Env, "PUBLIC_SITE_ORIGIN">, request: Request): string {
  return env.PUBLIC_SITE_ORIGIN || new URL(request.url).origin;
}

/** Canonical URL for the current request (F10). Pass `keepSearchParams` for params that change the primary content. */
export function getPageCanonicalUrl(
  env: Pick<Env, "PUBLIC_SITE_ORIGIN">,
  request: Request,
  keepSearchParams: readonly string[] = [],
): string {
  return getCanonicalUrl(request.url, { origin: getSiteOrigin(env, request), keepSearchParams });
}

/** `<link rel="canonical">` descriptor for a route `meta()` function. */
export function canonicalLink(href: string) {
  return { tagName: "link" as const, rel: "canonical", href };
}

type SeoHandlers = ReturnType<typeof buildSeoHandlers>;
const seoHandlersByOrigin = new Map<string, SeoHandlers>();

function buildSeoHandlers(origin: string | undefined) {
  return [
    createSitemapServerHandlers({ origin, routeTemplates, staticPaths: ["/", "/collections"] }),
    createRobotsTxtServerHandlers({ origin, routeTemplates }),
  ];
}

/**
 * SEO request handlers (`hydrogen-seo` skill), registered with
 * `handleShopifyRoutes` in `root.tsx` so `/sitemap.xml`, `/sitemap/:type/:page.xml`,
 * and `/robots.txt` are served before framework routing. Built once per
 * configured origin; URLs follow the same `routeTemplates` as the rest of the app.
 */
export function getSeoHandlers(env: Pick<Env, "PUBLIC_SITE_ORIGIN">): SeoHandlers {
  const origin = env.PUBLIC_SITE_ORIGIN || "";
  let handlers = seoHandlersByOrigin.get(origin);
  if (!handlers) {
    handlers = buildSeoHandlers(origin || undefined);
    seoHandlersByOrigin.set(origin, handlers);
  }
  return handlers;
}
