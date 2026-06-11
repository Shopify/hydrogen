import {
  parseCollectionParams,
  type AvailableFilter,
  type CollectionState,
} from "@shopify/hydrogen";
import { gql, type StorefrontClient } from "@shopify/hydrogen";
import type {
  ProductFilter as SfapiProductFilter,
  SearchSortKeys,
} from "@shopify/hydrogen/storefront-api-types";

import type { ProductCardData } from "../components/ProductCard";

const PRODUCTS_PER_PAGE = 24;

const SEARCH_QUERY = gql(`
  query Search(
    $term: String!
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $first: Int!
  ) {
    products: search(
      query: $term
      types: [PRODUCT]
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
      unavailableProducts: HIDE
      first: $first
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
        }
      }
      nodes {
        __typename
        ... on Product {
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`);

function searchBrowseVariables(
  term: string,
  browse: Pick<CollectionState, "filters" | "sortKey" | "reverse">,
) {
  const sortKey: SearchSortKeys = browse.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";

  return {
    term,
    first: PRODUCTS_PER_PAGE,
    filters: browse.filters.length > 0 ? (browse.filters as SfapiProductFilter[]) : undefined,
    sortKey,
    reverse: browse.reverse || undefined,
  };
}

export type SearchLoaderData = {
  term: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
};

export type QuerySearchOptions = {
  storefrontClient: StorefrontClient;
  searchParams: URLSearchParams;
};

export async function querySearch({
  storefrontClient,
  searchParams,
}: QuerySearchOptions): Promise<SearchLoaderData> {
  const term = searchParams.get("q")?.trim() ?? "";

  if (!term) {
    return {
      term,
      products: [],
      availableFilters: [],
      totalCount: 0,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  const parsed = parseCollectionParams(searchParams);
  const { data } = await storefrontClient.graphql(SEARCH_QUERY, {
    variables: searchBrowseVariables(term, parsed),
  });

  const products = data?.products;

  if (!products) {
    throw new Error("No search data returned from Shopify API");
  }

  const productNodes: ProductCardData[] = products.nodes.flatMap((node) => {
    if (node.__typename !== "Product") return [];
    return [
      {
        handle: node.handle,
        title: node.title,
        featuredImage: node.featuredImage,
        priceRange: node.priceRange,
      },
    ];
  });

  return {
    term,
    products: productNodes,
    availableFilters: products.productFilters,
    totalCount: products.totalCount,
    pageInfo: products.pageInfo,
  };
}
