import "server-only";
import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { COLLECTION_CARD_FRAGMENT } from "../components/CollectionCard";
import { getStorefrontClient } from "./storefront";
import { getRequestOrigin } from "./url";

const COLLECTIONS_PAGE_SIZE = 12;

export const COLLECTIONS_QUERY = gql(
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

type CollectionsQuery = StorefrontApi.ResultOf<typeof COLLECTIONS_QUERY>;

export type CollectionsPageData = {
  collections: CollectionsQuery["collections"];
  origin: string;
};

export async function loadCollectionsPage({ after }: { after?: string } = {}) {
  const storefront = await getStorefrontClient();
  const origin = await getRequestOrigin();
  const { data } = await storefront.graphql(COLLECTIONS_QUERY, {
    variables: {
      first: COLLECTIONS_PAGE_SIZE,
      after,
    },
  });

  if (!data) {
    throw new Error("Collections query returned no data");
  }

  return {
    collections: data.collections,
    origin,
  } satisfies CollectionsPageData;
}
