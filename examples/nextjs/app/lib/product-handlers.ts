import { createProductServerHandlers, gql } from "@shopify/hydrogen";

import { cartHandlers } from "./cart-handlers";

export const productHandlers = createProductServerHandlers({
  cartHandlers,
  fragment: gql(`
    fragment ProductFragment on Product {
      description
      images(first: 10) {
        nodes {
          url
          altText
        }
      }
    }
  `),
});
