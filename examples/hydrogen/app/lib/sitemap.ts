import { gql, type StorefrontApi } from "@shopify/hydrogen";
import type { SitemapType } from "@shopify/hydrogen/storefront-api-types";

import type { StorefrontClient } from "~/lib/storefront-client";

const CHANGE_FREQUENCY = "weekly";
const FIRST_SITEMAP_PAGE = 1;
const XML_CONTENT_TYPE = "application/xml";

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
  const baseUrl = getBaseUrl(request);
  const sitemapLocations = await getSitemapLocations({ baseUrl, storefront });
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

  const page = parseSitemapPage(params.page);
  const entries = await querySitemapEntries({ page, storefront, type: params.type });
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

async function getSitemapLocations({
  baseUrl,
  storefront,
}: {
  baseUrl: string;
  storefront: StorefrontClient;
}) {
  const locations = await Promise.all(
    SITEMAP_ROUTE_TYPES.map(async (type) => getSitemapTypeLocations({ baseUrl, storefront, type })),
  );
  return locations.flat();
}

async function getSitemapTypeLocations({
  baseUrl,
  storefront,
  type,
}: {
  baseUrl: string;
  storefront: StorefrontClient;
  type: SitemapRouteType;
}) {
  const pageCount = await querySitemapPageCount(storefront, type);
  return Array.from(
    { length: pageCount },
    (_, pageIndex) => `${baseUrl}/sitemap/${type}/${pageIndex + FIRST_SITEMAP_PAGE}.xml`,
  );
}

async function querySitemapPageCount(storefront: StorefrontClient, type: SitemapRouteType) {
  const { sitemap } = await storefront.query(SITEMAP_INDEX_QUERY, {
    variables: { type: SITEMAP_API_TYPE_BY_ROUTE_TYPE[type] },
  });
  return sitemap.pagesCount?.count ?? FIRST_SITEMAP_PAGE;
}

async function querySitemapEntries({
  page,
  storefront,
  type,
}: {
  page: number;
  storefront: StorefrontClient;
  type: SitemapRouteType;
}) {
  const { sitemap } = await storefront.query(SITEMAP_RESOURCES_QUERY, {
    variables: { page, type: SITEMAP_API_TYPE_BY_ROUTE_TYPE[type] },
  });
  const resources = sitemap.resources?.items ?? [];
  return resources.map((resource) => toSitemapEntry(resource, type));
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
