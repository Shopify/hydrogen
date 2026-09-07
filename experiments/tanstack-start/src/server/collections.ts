import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";

import { COLLECTION_CARD_FRAGMENT } from "~/components/CollectionCard";
import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";
import { collectionPath } from "~/lib/route-templates";

import { toStorefrontProductFilters } from "./filters";
import { throwNotFoundOrRedirect } from "./not-found";
import { requireData, storefrontFn } from "./storefront-fn";
import { handleAndSearchInput, searchInput } from "./validators";

export const COLLECTIONS_PAGE_SIZE = 12;
export const COLLECTION_PAGE_SIZE = 9;

const COLLECTIONS_QUERY = gql(
  `
    query CollectionsList($first: Int!, $after: String) {
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

const COLLECTION_QUERY = gql(
  `
    query CollectionPage(
      $handle: String!
      $first: Int!
      $after: String
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean
      $filters: [ProductFilter!]
    ) {
      shop {
        paymentSettings {
          currencyCode
        }
      }
      collection(handle: $handle) {
        id
        handle
        title
        description
        image {
          url
          altText
          width
          height
        }
        products(
          first: $first
          after: $after
          sortKey: $sortKey
          reverse: $reverse
          filters: $filters
        ) {
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

type CollectionQueryVariables = StorefrontApi.VariablesOf<typeof COLLECTION_QUERY>;

export const getCollections = storefrontFn
  .validator(searchInput)
  .handler(async ({ context, data }) => {
    const { storefrontClient } = context;
    const params = new URLSearchParams(data.search);
    const result = requireData(
      await storefrontClient.graphql(COLLECTIONS_QUERY, {
        variables: { first: COLLECTIONS_PAGE_SIZE, after: params.get("after") || null },
      }),
      "CollectionsList",
    );

    return {
      collections: result.collections,
      origin: new URL(context.request.url).origin,
    };
  });

export const getCollection = storefrontFn
  .validator(handleAndSearchInput)
  .handler(async ({ context, data }) => {
    const { storefrontClient } = context;
    const params = new URLSearchParams(data.search);
    const browse = parseCollectionParams(params);

    const variables: CollectionQueryVariables = {
      handle: data.handle,
      first: COLLECTION_PAGE_SIZE,
      after: params.get("after") || undefined,
      filters: toStorefrontProductFilters(browse.filters),
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    };

    const result = requireData(
      await storefrontClient.graphql(COLLECTION_QUERY, { variables }),
      "CollectionPage",
    );

    if (!result.collection) {
      return throwNotFoundOrRedirect(context, collectionPath(data.handle), data.search);
    }

    return {
      collection: result.collection,
      products: result.collection.products.nodes,
      availableFilters: result.collection.products.filters,
      pageInfo: result.collection.products.pageInfo,
      currencyCode: result.shop.paymentSettings.currencyCode,
      dataSearch: params.toString(),
      origin: new URL(context.request.url).origin,
    };
  });
