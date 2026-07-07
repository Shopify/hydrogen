import { gql, parseCollectionParams, type AvailableFilter } from "@shopify/hydrogen";

import { getNuxtRequestSearchParams, toStorefrontApiFilters } from "~/server/utils/storefront";

const PRODUCTS_PER_PAGE = 24;

type ProductCardData = {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

type SearchPageData = {
  term: string;
  dataSearch: string;
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
  totalCount: number;
};

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
    }
  }
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const searchParams = getNuxtRequestSearchParams(event);
  const term = searchParams.get("q")?.trim() ?? "";
  const dataSearch = searchParams.toString();

  if (!term) {
    return { term, dataSearch, products: [], availableFilters: [], totalCount: 0 };
  }

  const parsed = parseCollectionParams(searchParams);
  const sortKey = parsed.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";
  const { data } = await storefrontClient.graphql(SEARCH_QUERY, {
    variables: {
      term,
      first: PRODUCTS_PER_PAGE,
      filters: toStorefrontApiFilters(parsed.filters),
      sortKey,
      reverse: parsed.reverse || undefined,
    },
  });
  const products = data?.products;

  if (!products) {
    throw new Error("No search data returned from Shopify API");
  }

  const productNodes = products.nodes.flatMap((node): ProductCardData[] => {
    if (node.__typename !== "Product" || !node.handle || !node.title || !node.priceRange) return [];
    return [
      {
        handle: node.handle,
        title: node.title,
        featuredImage: node.featuredImage ?? null,
        priceRange: node.priceRange,
      },
    ];
  });

  return {
    term,
    dataSearch,
    products: productNodes,
    availableFilters: products.productFilters,
    totalCount: products.totalCount,
  } satisfies SearchPageData;
});
