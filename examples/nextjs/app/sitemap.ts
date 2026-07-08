import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { SITEMAP_QUERY } from "@/lib/queries";
import { SITE_ORIGIN } from "@/lib/site";
import { staticStorefrontClient } from "@/lib/storefront-static";

/**
 * `/sitemap.xml` (engineering.md F10). Lists product + collection URLs with
 * `updatedAt` timestamps, fetched via the shared `staticStorefrontClient`
 * inside a `use cache` cache-point (catalog, not personalized). mock.shop
 * fallback works (queries mock.shop).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await fetchSitemap();

  return entries.map((entry) => ({
    url: entry.loc,
    lastModified: entry.lastmod ?? undefined,
  }));
}

type SitemapEntry = { loc: string; lastmod?: string };

async function fetchSitemap(): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", "collections");

  const { data, errors } = await staticStorefrontClient.graphql(SITEMAP_QUERY);
  if (errors) {
    console.error("[hydrogen] Sitemap query failed", errors);
  }

  const entries: SitemapEntry[] = [
    { loc: `${SITE_ORIGIN}/` },
    { loc: `${SITE_ORIGIN}/collections` },
    { loc: `${SITE_ORIGIN}/search` },
  ];

  for (const collection of data?.collections?.nodes ?? []) {
    entries.push({
      loc: `${SITE_ORIGIN}/collections/${collection.handle}`,
      lastmod: collection.updatedAt ?? undefined,
    });
  }

  for (const product of data?.products?.nodes ?? []) {
    entries.push({
      loc: `${SITE_ORIGIN}/products/${product.handle}`,
      lastmod: product.updatedAt ?? undefined,
    });
  }

  return entries;
}
