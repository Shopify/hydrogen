import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";

export const SEARCH_PAGE_SIZE = 9;

export const SEARCH_QUERY = gql(
  `
    query SearchPage(
      $term: String!
      $first: Int!
      $after: String
      $sortKey: SearchSortKeys
      $reverse: Boolean
      $productFilters: [ProductFilter!]
    ) {
      shop {
        paymentSettings {
          currencyCode
        }
      }
      search(
        query: $term
        types: [PRODUCT]
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
        productFilters: $productFilters
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
            swatch {
              color
              image {
                previewImage {
                  url
                  altText
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

type SearchQueryResult = StorefrontApi.ResultOf<typeof SEARCH_QUERY>;
type SearchQueryVariables = StorefrontApi.VariablesOf<typeof SEARCH_QUERY>;
type SearchNode = SearchQueryResult["search"]["nodes"][number];
type SearchProductNode = Extract<SearchNode, { __typename: "Product" }>;
type SearchFilters = SearchQueryResult["search"]["productFilters"];
type SearchPageInfo = SearchQueryResult["search"]["pageInfo"];
type SearchCurrencyCode = SearchQueryResult["shop"]["paymentSettings"]["currencyCode"];

type SearchPageEmptyData = {
  performed: false;
  searchTerm: string;
  products: [];
  availableFilters: [];
  pageInfo: { hasNextPage: false; endCursor: null };
  currencyCode: null;
  totalCount: 0;
  dataSearch: string;
  origin: string;
};

type SearchPagePerformedData = {
  performed: true;
  searchTerm: string;
  products: SearchProductNode[];
  availableFilters: SearchFilters;
  pageInfo: SearchPageInfo;
  currencyCode: SearchCurrencyCode;
  totalCount: number;
  dataSearch: string;
  origin: string;
};

export type SearchPageData = SearchPageEmptyData | SearchPagePerformedData;

export async function loadSearchPage({
  storefrontClient,
  request,
}: {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  request: Request;
}): Promise<SearchPageData> {
  const url = new URL(request.url);
  const searchTerm = (url.searchParams.get("q") ?? "").trim();

  if (!searchTerm) {
    return {
      performed: false,
      searchTerm,
      products: [],
      availableFilters: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      currencyCode: null,
      totalCount: 0,
      dataSearch: url.searchParams.toString(),
      origin: url.origin,
    };
  }

  const browse = parseCollectionParams(url.searchParams);
  const after = url.searchParams.get("after") || undefined;
  const sortKey = browse.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";

  const variables: SearchQueryVariables = {
    term: searchTerm,
    first: SEARCH_PAGE_SIZE,
    after,
    productFilters:
      browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
    sortKey,
    reverse: sortKey === "PRICE" ? browse.reverse || undefined : undefined,
  };

  const { data } = await storefrontClient.graphql(SEARCH_QUERY, { variables });

  if (!data?.search) throw new Response("Search unavailable", { status: 502 });

  const products = data.search.nodes.filter(
    (node): node is SearchProductNode => node.__typename === "Product",
  );

  return {
    performed: true,
    searchTerm,
    products,
    availableFilters: data.search.productFilters,
    pageInfo: data.search.pageInfo,
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: data.search.totalCount,
    dataSearch: url.searchParams.toString(),
    origin: url.origin,
  };
}
