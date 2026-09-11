import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type { RequestScopedPrivateStorefrontClient } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";

export const COLLECTION_PAGE_SIZE = 9;

export const COLLECTION_QUERY = gql(
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

export async function loadCollectionPage({
  storefrontClient,
  handle,
  request,
}: {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  handle: string;
  request: Request;
}) {
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);
  const after = url.searchParams.get("after") || undefined;

  const variables: CollectionQueryVariables = {
    handle,
    first: COLLECTION_PAGE_SIZE,
    after,
    filters:
      browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
    sortKey: browse.sortKey,
    reverse: browse.reverse || undefined,
  };

  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, { variables });

  if (!data?.collection) throw new Response("Collection not found", { status: 404 });

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    availableFilters: data.collection.products.filters,
    pageInfo: data.collection.products.pageInfo,
    currencyCode: data.shop.paymentSettings.currencyCode,
    dataSearch: url.searchParams.toString(),
    origin: url.origin,
  };
}
