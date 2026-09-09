import { gql } from "@shopify/hydrogen";
import { createFileRoute } from "@tanstack/react-router";

import { collectionPath, productPath } from "~/lib/route-templates";
import { shopifyRequestMiddleware } from "~/server/shopify-middleware";

// The Storefront API caps connections at 250 per page; larger catalogs need a
// sitemap index with paginated child sitemaps. Kept single-page on purpose.
const SITEMAP_PAGE_SIZE = 250;

const SITEMAP_QUERY = gql(`
  query Sitemap($first: Int!) {
    products(first: $first) {
      nodes {
        handle
        updatedAt
      }
    }
    collections(first: $first) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`);

const STATIC_PATHS = ["/", "/collections", "/search", "/blogs/news"];

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function urlEntry(origin: string, path: string, lastModified?: string): string {
  const loc = `<loc>${escapeXml(`${origin}${path}`)}</loc>`;
  const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : "";
  return `<url>${loc}${lastmod}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    middleware: [shopifyRequestMiddleware],
    handlers: {
      GET: async ({ request, context }) => {
        const origin = new URL(request.url).origin;
        const { data } = await context.storefrontClient.graphql(SITEMAP_QUERY, {
          variables: { first: SITEMAP_PAGE_SIZE },
        });

        const entries = [
          ...STATIC_PATHS.map((path) => urlEntry(origin, path)),
          ...(data?.products.nodes ?? []).map((product) =>
            urlEntry(origin, productPath(product.handle), product.updatedAt),
          ),
          ...(data?.collections.nodes ?? []).map((collection) =>
            urlEntry(origin, collectionPath(collection.handle), collection.updatedAt),
          ),
        ];

        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          entries.join("") +
          "</urlset>";

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
