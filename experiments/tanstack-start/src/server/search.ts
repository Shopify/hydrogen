import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";

import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";

import { toStorefrontProductFilters } from "./filters";
import { storefrontFn } from "./storefront-fn";
import { searchInput } from "./validators";

export const SEARCH_PAGE_SIZE = 9;

const SEARCH_QUERY = gql(
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
export type SearchProductNode = Extract<SearchNode, { __typename: "Product" }>;

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
  availableFilters: SearchQueryResult["search"]["productFilters"];
  pageInfo: SearchQueryResult["search"]["pageInfo"];
  currencyCode: SearchQueryResult["shop"]["paymentSettings"]["currencyCode"];
  totalCount: number;
  dataSearch: string;
  origin: string;
};

export type SearchPageData = SearchPageEmptyData | SearchPagePerformedData;

export const getSearch = storefrontFn
  .validator(searchInput)
  .handler(async ({ context, data }): Promise<SearchPageData> => {
    const { storefrontClient } = context;
    const params = new URLSearchParams(data.search);
    const searchTerm = (params.get("q") ?? "").trim();
    const origin = new URL(context.request.url).origin;

    if (!searchTerm) {
      return {
        performed: false,
        searchTerm,
        products: [],
        availableFilters: [],
        pageInfo: { hasNextPage: false, endCursor: null },
        currencyCode: null,
        totalCount: 0,
        dataSearch: params.toString(),
        origin,
      };
    }

    const browse = parseCollectionParams(params);
    const sortKey = browse.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";

    const variables: SearchQueryVariables = {
      term: searchTerm,
      first: SEARCH_PAGE_SIZE,
      after: params.get("after") || undefined,
      productFilters: toStorefrontProductFilters(browse.filters),
      sortKey,
      reverse: sortKey === "PRICE" ? browse.reverse || undefined : undefined,
    };

    const { data: result } = await storefrontClient.graphql(SEARCH_QUERY, { variables });

    if (!result?.search) throw new Error("Search is unavailable right now.");

    return {
      performed: true,
      searchTerm,
      products: result.search.nodes.filter(
        (node): node is SearchProductNode => node.__typename === "Product",
      ),
      availableFilters: result.search.productFilters,
      pageInfo: result.search.pageInfo,
      currencyCode: result.shop.paymentSettings.currencyCode,
      totalCount: result.search.totalCount,
      dataSearch: params.toString(),
      origin,
    };
  });
