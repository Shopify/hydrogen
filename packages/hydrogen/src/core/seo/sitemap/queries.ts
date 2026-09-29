import { gql } from "../../../graphql";
import type { SitemapType } from "../../../graphql/generated/storefront-api-types";
import type { SitemapResourceType } from "./types";

export const SITEMAP_TYPE_BY_RESOURCE_TYPE = {
  products: "PRODUCT",
  collections: "COLLECTION",
  pages: "PAGE",
  blogs: "BLOG",
  articles: "ARTICLE",
  metaobjects: "METAOBJECT",
} as const satisfies Record<SitemapResourceType, SitemapType>;

export const SITEMAP_RESOURCE_TYPES = [
  "products",
  "collections",
  "pages",
  "blogs",
  "articles",
  "metaobjects",
] as const satisfies readonly SitemapResourceType[];

export const SITEMAP_INDEX_QUERY = gql(`
  query HydrogenSitemapIndex {
    products: sitemap(type: PRODUCT) {
      pagesCount {
        count
      }
    }
    collections: sitemap(type: COLLECTION) {
      pagesCount {
        count
      }
    }
    pages: sitemap(type: PAGE) {
      pagesCount {
        count
      }
    }
    blogs: sitemap(type: BLOG) {
      pagesCount {
        count
      }
    }
    articles: sitemap(type: ARTICLE) {
      pagesCount {
        count
      }
    }
    metaobjects: sitemap(type: METAOBJECT) {
      pagesCount {
        count
      }
    }
  }
`);

export const SITEMAP_PAGE_QUERY = gql(`
  query HydrogenSitemapPage($type: SitemapType!, $page: Int!) {
    sitemap(type: $type) {
      resources(page: $page) {
        items {
          handle
          updatedAt
          ... on SitemapResourceMetaobject {
            type
            onlineStoreUrlHandle
          }
        }
      }
    }
  }
`);
