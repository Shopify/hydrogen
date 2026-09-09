import { createCartServerHandlers, gql } from "@shopify/hydrogen";

// Hydrogen's default cart fragment already carries line merchandise identity,
// product identity and per-quantity cost. `updatedAt` lets the analytics bus
// dedupe cart-change events and `merchandise.price` is the shape
// `AnalyticsCartLine` expects.
const CART_FRAGMENT = gql(`
  fragment CartFragment on Cart {
    updatedAt
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`);

export const cartHandlers = createCartServerHandlers({
  fragment: CART_FRAGMENT,
});
