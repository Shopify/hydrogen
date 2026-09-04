import { createCartServerHandlers, gql } from "@shopify/hydrogen";

// Extends every cart query/mutation response with the delivery instructions
// metafield so it can be read from cart data (see CartDeliveryInstructions).
// Writes go through the app-owned /api/cart/metafields route (see cart-metafields.server.ts).
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
