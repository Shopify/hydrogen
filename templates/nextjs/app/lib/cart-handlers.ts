import { createCartServerHandlers, gql } from "@shopify/hydrogen";

const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    updatedAt
  }
`);

export const cartHandlers = createCartServerHandlers({ fragment: CART_FRAGMENT });
