import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { COLLECTION_CARD_FRAGMENT, PRODUCT_CARD_FRAGMENT } from "./fragments";

/**
 * Home query — best-selling products (first 8) + featured collections (first 3).
 * Used by the home page (`hydrogen-setup` / `steps/3-build-home-page.md`).
 */
export const HOME_QUERY = gql(
  `
  query Home($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    featuredProducts: products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
    featuredCollections: collections(first: 3) {
      nodes {
        ...CollectionCard
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

/** Collections index query (`collections(first: 24)`). */
export const COLLECTIONS_QUERY = gql(
  `
  query CollectionsList($first: Int!, $after: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...CollectionCard
      }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT],
);

/**
 * Collection PLP query. `filters` and `sortKey`/`reverse` come from
 * `parseCollectionParams`. The `__typename` discipline is on `ProductCard`
 * (no unions here).
 */
export const COLLECTION_QUERY = gql(
  `
  query Collection($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      image {
        url
        altText
        width
        height
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
          id
          label
          type
          presentation
          values {
            id
            label
            count
            input
            swatch {
              color
              image {
                previewImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...ProductCard
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

type CollectionQuery = StorefrontApi.ResultOf<typeof COLLECTION_QUERY>;
type CollectionProducts = NonNullable<CollectionQuery["collection"]>["products"];
export type CollectionAvailableFilter = CollectionProducts["filters"][number];

/**
 * Search query. **`__typename` on `search.nodes` is required** — `search` is a
 * heterogeneous union and without `__typename` gql.tada infers `never` for the
 * node type and all results are dropped (feedback Round 1 + Round 2 #1).
 */
export const SEARCH_QUERY = gql(
  `
  query Search($query: String!, $first: Int!, $after: String, $sortKey: SearchSortKeys, $reverse: Boolean, $productFilters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    search(query: $query, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, productFilters: $productFilters) {
      totalCount
      productFilters {
        id
        label
        type
        presentation
        values {
          id
          label
          count
          input
          swatch {
            color
            image {
              previewImage {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        __typename
        ... on Product {
          ...ProductCard
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

type SearchQuery = StorefrontApi.ResultOf<typeof SEARCH_QUERY>;
export type SearchAvailableFilter = NonNullable<SearchQuery["search"]>["productFilters"][number];

/** Shop analytics GID query (root layout, best-effort + non-blocking, F1). */
export const SHOP_ANALYTICS_QUERY = gql(`
  query RootShopAnalytics($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      id
      name
      description
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
    }
  }
`);

/** Sitemap query — all products + collections with `updatedAt`. */
export const SITEMAP_QUERY = gql(`
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
