import { gql, type GraphQLFormattedError, type StorefrontApi } from "@shopify/hydrogen";
import type { SitemapType } from "@shopify/hydrogen/storefront-api-types";

import type { StorefrontClient } from "~/lib/storefront-client";

const CHANGE_FREQUENCY = "weekly";
const FIRST_SITEMAP_PAGE = 1;
const XML_CONTENT_TYPE = "application/xml";
const THROTTLED_CODE = "THROTTLED";
// The Storefront API throttles `sitemap.resources` per shop over a 20 second sliding window.
const THROTTLED_RETRY_AFTER_SECONDS = "30";

const SITEMAP_ROUTE_TYPES = [
  "products",
  "pages",
  "collections",
  "metaObjects",
  "articles",
  "blogs",
] as const;
const SITEMAP_API_TYPE_BY_ROUTE_TYPE = {
  articles: "ARTICLE",
  blogs: "BLOG",
  collections: "COLLECTION",
  metaObjects: "METAOBJECT",
  pages: "PAGE",
  products: "PRODUCT",
} satisfies Record<SitemapRouteType, SitemapType>;
const SITEMAP_URL_TYPE_BY_ROUTE_TYPE = {
  articles: "blogs",
  blogs: "blogs",
  collections: "collections",
  metaObjects: "metaobjects",
  pages: "pages",
  products: "products",
} satisfies Record<SitemapRouteType, string>;

type SitemapRouteType = (typeof SITEMAP_ROUTE_TYPES)[number];
type SitemapResources = StorefrontApi.ResultOf<
  typeof SITEMAP_RESOURCES_QUERY
>["sitemap"]["resources"];
type SitemapResource = NonNullable<SitemapResources>["items"][number];
type SitemapEntry = {
  handle: string;
  type: string;
  updatedAt: string;
};

export async function createSitemapIndexResponse({
  request,
  storefront,
}: {
  request: Request;
  storefront: StorefrontClient;
}) {
  const pageCounts = await Promise.all(
    SITEMAP_ROUTE_TYPES.map(async (type) => ({
      type,
      result: await storefront.query(SITEMAP_INDEX_QUERY, {
        variables: { type: SITEMAP_API_TYPE_BY_ROUTE_TYPE[type] },
      }),
    })),
  );
  const errorResponse = sitemapErrorResponse(
    pageCounts.flatMap(({ result }) => result.errors ?? []),
  );
  if (errorResponse) return errorResponse;

  const baseUrl = getBaseUrl(request);
  const sitemapLocations = pageCounts.flatMap(({ type, result }) =>
    Array.from(
      { length: result.sitemap.pagesCount?.count ?? FIRST_SITEMAP_PAGE },
      (_, pageIndex) => `${baseUrl}/sitemap/${type}/${pageIndex + FIRST_SITEMAP_PAGE}.xml`,
    ),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapLocations.map((location) => `  <sitemap><loc>${escapeXml(location)}</loc></sitemap>`).join("\n")}
</sitemapindex>`;

  return xmlResponse(body);
}

export async function createSitemapResponse({
  getLink,
  locales,
  params,
  request,
  storefront,
}: {
  getLink: (entry: SitemapEntry & { baseUrl: string; locale?: string }) => string;
  locales: string[];
  params: { type?: string; page?: string };
  request: Request;
  storefront: StorefrontClient;
}) {
  if (!isSitemapRouteType(params.type)) {
    return new Response("Sitemap not found", { status: 404 });
  }

  const routeType = params.type;
  const result = await storefront.query(SITEMAP_RESOURCES_QUERY, {
    variables: {
      page: parseSitemapPage(params.page),
      type: SITEMAP_API_TYPE_BY_ROUTE_TYPE[routeType],
    },
  });
  const errorResponse = sitemapErrorResponse(result.errors);
  if (errorResponse) return errorResponse;

  const entries = (result.sitemap.resources?.items ?? []).map((resource) =>
    toSitemapEntry(resource, routeType),
  );
  const baseUrl = getBaseUrl(request);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map((entry) => sitemapUrlXml({ baseUrl, entry, getLink, locales })).join("\n")}
</urlset>`;

  return xmlResponse(body);
}

function isSitemapRouteType(value: string | undefined): value is SitemapRouteType {
  return SITEMAP_ROUTE_TYPES.some((type) => type === value);
}

// A failed read must not become an empty sitemap: crawlers would drop every URL it used to list.
function sitemapErrorResponse(errors: GraphQLFormattedError[] | undefined): Response | undefined {
  if (!errors?.length) return undefined;

  if (errors.some((error) => error.extensions?.code === THROTTLED_CODE)) {
    return new Response("Too many sitemap requests. Please try again later.", {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": THROTTLED_RETRY_AFTER_SECONDS },
    });
  }

  return new Response("Sitemap unavailable. Please try again later.", {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

function toSitemapEntry(resource: SitemapResource, routeType: SitemapRouteType): SitemapEntry {
  if (resource.__typename === "SitemapResourceMetaobject") {
    return {
      handle: resource.handle,
      type: resource.onlineStoreUrlHandle ?? SITEMAP_URL_TYPE_BY_ROUTE_TYPE[routeType],
      updatedAt: resource.updatedAt,
    };
  }

  return {
    handle: resource.handle,
    type: SITEMAP_URL_TYPE_BY_ROUTE_TYPE[routeType],
    updatedAt: resource.updatedAt,
  };
}

function parseSitemapPage(page: string | undefined) {
  const parsedPage = Number.parseInt(page ?? String(FIRST_SITEMAP_PAGE), 10);
  if (Number.isNaN(parsedPage) || parsedPage < FIRST_SITEMAP_PAGE) return FIRST_SITEMAP_PAGE;
  return parsedPage;
}

function sitemapUrlXml({
  baseUrl,
  entry,
  getLink,
  locales,
}: {
  baseUrl: string;
  entry: SitemapEntry;
  getLink: (entry: SitemapEntry & { baseUrl: string; locale?: string }) => string;
  locales: string[];
}) {
  const localizedLinks = locales.map((locale) => ({
    href: getLink({ ...entry, baseUrl, locale }),
    locale,
  }));
  const defaultLink = getLink({ ...entry, baseUrl });

  return [
    "  <url>",
    `    <loc>${escapeXml(defaultLink)}</loc>`,
    `    <lastmod>${escapeXml(entry.updatedAt)}</lastmod>`,
    `    <changefreq>${CHANGE_FREQUENCY}</changefreq>`,
    ...localizedLinks.map(
      ({ href, locale }) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(href)}" />`,
    ),
    "  </url>",
  ].join("\n");
}

function getBaseUrl(request: Request) {
  return new URL(request.url).origin;
}

function xmlResponse(body: string) {
  return new Response(body, {
    headers: { "Content-Type": XML_CONTENT_TYPE },
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const SITEMAP_INDEX_QUERY = gql(`
  query SitemapIndex($type: SitemapType!) {
    sitemap(type: $type) {
      pagesCount {
        count
      }
    }
  }
`);

const SITEMAP_RESOURCES_QUERY = gql(`
  query SitemapResources($type: SitemapType!, $page: Int!) {
    sitemap(type: $type) {
      resources(page: $page) {
        items {
          __typename
          handle
          updatedAt
          ... on SitemapResourceMetaobject {
            onlineStoreUrlHandle
          }
        }
      }
    }
  }
`);
