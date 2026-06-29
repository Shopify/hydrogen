import "server-only";
import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type {
  ProductFilter as StorefrontApiProductFilter,
  SearchSortKeys,
} from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "../components/ProductCard";
import { getStorefrontClient } from "./storefront";
import { getRequestOrigin } from "./url";

const SEARCH_PAGE_SIZE = 9;

export const SEARCH_QUERY = gql(
  `
    query SearchPage(
      $query: String!
      $first: Int!
      $after: String
      $productFilters: [ProductFilter!]
      $sortKey: SearchSortKeys
      $reverse: Boolean
    ) {
      shop {
        paymentSettings {
          currencyCode
        }
      }
      search(
        query: $query
        first: $first
        after: $after
        productFilters: $productFilters
        sortKey: $sortKey
        reverse: $reverse
        types: [PRODUCT]
      ) {
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
            image {
              image {
                url
                altText
                width
                height
              }
              previewImage {
                url
                altText
                width
                height
              }
            }
            swatch {
              color
              image {
                image {
                  url
                  altText
                  width
                  height
                }
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
type SearchConnection = SearchQuery["search"];
type SearchNode = SearchConnection["nodes"][number];
type SearchProduct = Extract<SearchNode, { __typename: "Product" }>;
type SearchPageInfo = SearchConnection["pageInfo"];

const EMPTY_PAGE_INFO: SearchPageInfo = { hasNextPage: false, endCursor: null };

export type SearchPageData = {
  searchTerm: string;
  products: SearchProduct[];
  availableFilters: SearchConnection["productFilters"];
  pageInfo: SearchPageInfo;
  dataSearch: string;
  origin: string;
  totalCount: number;
} & (
  | { performed: false; currencyCode: null }
  | { performed: true; currencyCode: SearchQuery["shop"]["paymentSettings"]["currencyCode"] }
);

function isProductNode(node: SearchNode): node is SearchProduct {
  return node.__typename === "Product";
}

function searchTermFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("q") ?? "").trim();
}

function toSearchSort(sortKey: string | undefined, reverse: boolean) {
  if (sortKey === "PRICE") {
    return { sortKey: "PRICE" as SearchSortKeys, reverse };
  }

  return { sortKey: "RELEVANCE" as SearchSortKeys, reverse: false };
}

export async function loadSearchPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}): Promise<SearchPageData> {
  const searchTerm = searchTermFromParams(searchParams);
  const origin = await getRequestOrigin();

  if (!searchTerm) {
    return {
      performed: false,
      searchTerm,
      products: [],
      availableFilters: [],
      pageInfo: EMPTY_PAGE_INFO,
      currencyCode: null,
      totalCount: 0,
      dataSearch: searchParams.toString(),
      origin,
    };
  }

  const browse = parseCollectionParams(searchParams);
  const sort = toSearchSort(browse.sortKey, browse.reverse);
  const after = searchParams.get("after") || undefined;
  const storefront = await getStorefrontClient();

  const { data } = await storefront.graphql(SEARCH_QUERY, {
    variables: {
      query: searchTerm,
      first: SEARCH_PAGE_SIZE,
      after,
      productFilters:
        browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
      sortKey: sort.sortKey,
      reverse: sort.reverse || undefined,
    },
  });

  if (!data) throw new Response("Search unavailable", { status: 502 });

  const search = data.search;

  return {
    performed: true,
    searchTerm,
    products: search.nodes.filter(isProductNode),
    availableFilters: search.productFilters,
    pageInfo: search.pageInfo,
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: search.totalCount,
    dataSearch: searchParams.toString(),
    origin,
  };
}
