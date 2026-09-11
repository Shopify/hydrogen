import { getSupportedLocales } from "@shopify/hydrogen";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { i18n } from "@/lib/config";
import { alternateUrls, canonicalUrl } from "@/lib/locale";
import { SITEMAP_QUERY } from "@/lib/queries";
import { getStaticStorefrontClient } from "@/lib/storefront-static";

/**
 * `/sitemap.xml`. Lists product + collection paths once per supported locale,
 * each entry carrying `hreflang` alternates for the other locales. Fetched via
 * the default-locale `getStaticStorefrontClient()` inside a `use cache`
 * cache-point (catalog, not personalized); handles are the same in every
 * locale, so one query covers all of them. mock.shop fallback works (queries
 * mock.shop).
 *
 * Lives outside `app/[locale]` because `proxy.ts` passes file-like paths
 * through untouched, so `/sitemap.xml` is served from the root.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await fetchSitemap();

  const locales = getSupportedLocales(i18n);
  return entries.flatMap((entry) => {
    const languages = alternateUrls(entry.path);
    return locales.map((locale) => ({
      url: canonicalUrl(entry.path, locale),
      lastModified: entry.lastmod ?? undefined,
      alternates: { languages },
    }));
  });
}

type SitemapEntry = { path: string; lastmod?: string };

async function fetchSitemap(): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", "collections");

  const { data, errors } = await getStaticStorefrontClient().graphql(SITEMAP_QUERY);
  if (errors) {
    console.error("[hydrogen] Sitemap query failed", errors);
  }

  const entries: SitemapEntry[] = [{ path: "/" }, { path: "/collections" }, { path: "/search" }];

  for (const collection of data?.collections?.nodes ?? []) {
    entries.push({
      path: `/collections/${collection.handle}`,
      lastmod: collection.updatedAt ?? undefined,
    });
  }

  for (const product of data?.products?.nodes ?? []) {
    entries.push({
      path: `/products/${product.handle}`,
      lastmod: product.updatedAt ?? undefined,
    });
  }

  return entries;
}
