import { createCartServerHandlers, gql } from "@shopify/hydrogen";

// Extends every cart query/mutation response with the delivery instructions
// metafield so it can be rendered from cart data (see CartDeliveryInstructions).
const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    metafields(identifiers: [{ namespace: "custom", key: "delivery_instructions" }]) {
      namespace
      key
      type
      value
    }
  }
`);

export const cartHandlers = createCartServerHandlers({ fragment: CART_FRAGMENT });
