import { gql } from "@shopify/hydrogen";

import { COLLECTION_CARD_FRAGMENT } from "~/components/CollectionCard";
import { PRODUCT_CARD_FRAGMENT } from "~/components/ProductCard";

import { requireData, storefrontFn } from "./storefront-fn";

const HOME_QUERY = gql(
  `
    query Home {
      products(first: 8, sortKey: BEST_SELLING) {
        nodes {
          ...ProductCard
        }
      }
      collections(first: 3) {
        nodes {
          ...CollectionCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT, COLLECTION_CARD_FRAGMENT],
);

export const getHome = storefrontFn.handler(async ({ context }) => {
  const { storefrontClient } = context;
  const data = requireData(await storefrontClient.graphql(HOME_QUERY), "Home");

  return {
    featuredProducts: data.products.nodes,
    featuredCollections: data.collections.nodes,
  };
});
