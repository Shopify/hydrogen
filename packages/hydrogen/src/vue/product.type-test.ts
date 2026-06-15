import { describe, expectTypeOf, it } from "vitest";

import { createCartServerHandlers } from "../core/cart";
import { createProductServerHandlers } from "../core/product";
import { gql } from "../graphql";
import { createProductComponents } from "./product";

const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            currentlyNotInStock
          }
        }
      }
    }
  }
`);

const cartHandlers = createCartServerHandlers({ fragment: cartFragment });

const productFragment = gql(`
  fragment ProductFragment on Product {
    description
    options {
      optionValues {
        firstSelectableVariant {
          currentlyNotInStock
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
    adjacentVariants(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      currentlyNotInStock
    }
  }
`);

const productHandlers = createProductServerHandlers({
  cartHandlers,
  fragment: productFragment,
});

const typedProduct = createProductComponents<typeof productHandlers>();

describe("createProductComponents", () => {
  it("derives Vue product props and composables from product server handlers", () => {
    type ProductProviderProps = InstanceType<typeof typedProduct.ProductProvider>["$props"];
    type ProductData = ProductProviderProps["product"];
    type SelectedVariant = NonNullable<ReturnType<typeof typedProduct.useProduct>["selectedVariant"]>;

    expectTypeOf<ProductData>().toHaveProperty("description").toEqualTypeOf<string>();
    expectTypeOf<SelectedVariant>()
      .toHaveProperty("currentlyNotInStock")
      .toEqualTypeOf<boolean>();
  });
});
