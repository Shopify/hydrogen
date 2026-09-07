import { HEADER_COLLECTIONS_QUERY, normalizeHeaderCollections } from "@shared/header";
import { gql } from "@shopify/hydrogen";

import type { StripIndexSignatures } from "~/lib/serializable";

import { cartHandlers } from "./cart-handlers";
import { storefrontFn } from "./storefront-fn";

const NAV_COLLECTIONS_QUERY = gql(HEADER_COLLECTIONS_QUERY);

/**
 * Root loader data: the cart seed for `CartProvider` and header navigation.
 * Deliberately reads nothing from the customer session — that would mark every
 * document as personalized (`private, no-store`).
 */
export const getRootData = storefrontFn.handler(async ({ context }) => {
  const { storefrontClient } = context;

  const [cartResult, navResult] = await Promise.all([
    cartHandlers.get({ storefrontClient, request: context.request }),
    storefrontClient.graphql(NAV_COLLECTIONS_QUERY),
  ]);

  // Hydrogen's cart types carry open index signatures that TanStack's
  // serializable-return check rejects; this is a type-only narrowing.
  const cartData: StripIndexSignatures<typeof cartResult.data> = cartResult.data;

  return {
    cartData,
    navCollections: normalizeHeaderCollections(navResult.data?.collections.nodes),
  };
});
