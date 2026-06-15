import { createProductServerHandlers, gql } from "@shopify/hydrogen";

import { cartHandlers } from "~/lib/cart-handlers";

export const productHandlers = createProductServerHandlers({
  cartHandlers,
  fragment: gql(`
    fragment ProductFragment on Product {
      descriptionHtml
      seo {
        description
        title
      }
    }
  `),
});
