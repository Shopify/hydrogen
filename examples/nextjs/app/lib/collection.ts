import {
  parseCollectionParams,
  type AvailableFilter,
  type CollectionState,
} from "@shopify/hydrogen";
import { gql, type StorefrontClient } from "@shopify/hydrogen";
import type { ProductFilter as SfapiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import type { ProductCardData } from "../components/ProductCard";

const PRODUCTS_PER_PAGE = 24;

const COLLECTION_QUERY = gql(`
  query Collection(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $first: Int!
  ) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: $first, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
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
      }
    }
  }
`);

function collectionBrowseVariables(
  handle: string,
  browse: Pick<CollectionState, "filters" | "sortKey" | "reverse">,
) {
  return {
    handle,
    first: PRODUCTS_PER_PAGE,
    filters: browse.filters.length > 0 ? (browse.filters as SfapiProductFilter[]) : undefined,
    sortKey: browse.sortKey,
    reverse: browse.reverse || undefined,
  };
}

export type CollectionLoaderData = {
  collection: {
    id: string;
    handle: string;
    title: string | null;
    description: string | null;
  };
  products: ProductCardData[];
  availableFilters: AvailableFilter[];
};

export type QueryCollectionOptions = {
  storefrontClient: StorefrontClient;
  handle: string;
  searchParams: URLSearchParams;
};

export async function queryCollection({
  storefrontClient,
  handle,
  searchParams,
}: QueryCollectionOptions): Promise<CollectionLoaderData | null> {
  const parsed = parseCollectionParams(searchParams);

  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: collectionBrowseVariables(handle, parsed),
  });

  if (!data?.collection) {
    return null;
  }

  const collection = data.collection;
  const products = collection.products;

  const availableFilters: AvailableFilter[] = products.filters.map((filter) => ({
    id: filter.id,
    label: filter.label,
    type: filter.type,
    presentation: filter.presentation,
    values: filter.values.map((value) => ({
      id: value.id,
      label: value.label,
      count: value.count,
      input: value.input,
    })),
  }));

  return {
    collection: {
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      description: collection.description,
    },
    products: products.nodes,
    availableFilters,
  };
}
