import { Cache, gql } from "@shopify/hydrogen";
import type { LoaderFunctionArgs } from "react-router";

import { getSiteOrigin } from "~/lib/config";
import { envContext } from "~/lib/platform";
import { storefrontClientContext } from "~/lib/storefront-context";

const SITEMAP_QUERY = gql(`
  query Sitemap($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 250) {
      nodes {
        handle
        updatedAt
      }
    }
    collections(first: 250) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`);

type SitemapEntry = { loc: string; lastmod?: string };

export async function loader({ context }: LoaderFunctionArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const siteOrigin = getSiteOrigin(context.get(envContext));
  const { data, errors } = await storefrontClient.graphql(SITEMAP_QUERY, {
    cache: Cache.long(),
  });

  if (errors) {
    console.error("[hydrogen] Sitemap query failed", errors);
  }

  const entries: SitemapEntry[] = [
    { loc: `${siteOrigin}/` },
    { loc: `${siteOrigin}/collections` },
    { loc: `${siteOrigin}/search` },
  ];

  for (const collection of data?.collections?.nodes ?? []) {
    entries.push({
      loc: `${siteOrigin}/collections/${collection.handle}`,
      lastmod: collection.updatedAt ?? undefined,
    });
  }

  for (const product of data?.products?.nodes ?? []) {
    entries.push({
      loc: `${siteOrigin}/products/${product.handle}`,
      lastmod: product.updatedAt ?? undefined,
    });
  }

  const xml = renderSitemap(entries);
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n${lastmod}  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
