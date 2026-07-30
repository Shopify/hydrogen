import { gql, parseCollectionParams, type AvailableFilter } from "@shopify/hydrogen";

import { getNuxtRequestSearchParams, toStorefrontApiFilters } from "~/server/utils/storefront";

type ProductCardData = {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

type CollectionPageData = {
  dataSearch: string;
  collection: {
    id: string;
    handle: string;
    title: string;
    description: string | null;
    products: {
      nodes: ProductCardData[];
      filters: AvailableFilter[];
    };
  };
};

const COLLECTION_QUERY = gql(`
  query Collection(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: 24, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        nodes {
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
          }
        }
      }
    }
  }
`);

export default defineEventHandler(async (event) => {
  const { storefrontClient } = event.context;
  const handle = getRouterParam(event, "handle");
  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: "Collection handle is required" });
  }

  const searchParams = getNuxtRequestSearchParams(event);
  const parsed = parseCollectionParams(searchParams);
  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      filters: toStorefrontApiFilters(parsed.filters),
      sortKey: parsed.sortKey ?? undefined,
      reverse: parsed.reverse || undefined,
    },
  });
  const collection = data?.collection;
  if (!collection) return null;

  return {
    dataSearch: searchParams.toString(),
    collection,
  } satisfies CollectionPageData;
});
