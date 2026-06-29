import "server-only";
import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "../components/ProductCard";
import { getStorefrontClient } from "./storefront";
import { getRequestOrigin } from "./url";

const COLLECTION_PAGE_SIZE = 9;

export const COLLECTION_QUERY = gql(
  `
    query CollectionPage(
      $handle: String!
      $first: Int!
      $after: String
      $filters: [ProductFilter!]
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean
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
        descriptionHtml
        image {
          url
          altText
          width
          height
        }
        seo {
          title
          description
        }
        products(
          first: $first
          after: $after
          filters: $filters
          sortKey: $sortKey
          reverse: $reverse
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
            ...ProductCard
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type CollectionQuery = StorefrontApi.ResultOf<typeof COLLECTION_QUERY>;
type Collection = NonNullable<CollectionQuery["collection"]>;

export type CollectionPageData = {
  collection: Collection;
  products: Collection["products"]["nodes"];
  availableFilters: Collection["products"]["filters"];
  pageInfo: Collection["products"]["pageInfo"];
  currencyCode: CollectionQuery["shop"]["paymentSettings"]["currencyCode"];
  dataSearch: string;
  origin: string;
};

export async function loadCollectionPage({
  handle,
  searchParams,
}: {
  handle: string;
  searchParams: URLSearchParams;
}): Promise<CollectionPageData> {
  const browse = parseCollectionParams(searchParams);
  const after = searchParams.get("after") || undefined;
  const storefront = await getStorefrontClient();
  const origin = await getRequestOrigin();

  const { data } = await storefront.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      first: COLLECTION_PAGE_SIZE,
      after,
      filters:
        browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (!data?.collection) {
    throw new Response("Collection not found", { status: 404 });
  }

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    availableFilters: data.collection.products.filters,
    pageInfo: data.collection.products.pageInfo,
    currencyCode: data.shop.paymentSettings.currencyCode,
    dataSearch: searchParams.toString(),
    origin,
  };
}
