import { describe, expectTypeOf, it } from "vitest";

import { createCartServerHandlers } from "../cart";
import { gql } from "../../graphql";
import { createProductServerHandlers, type ProductDataFromHandlers } from "./server-handlers";

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

const compatibleProductFragment = gql(`
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
  fragment: compatibleProductFragment,
});

const incompatibleProductFragment = gql(`
  fragment ProductFragment on Product {
    description
  }
`);

// @ts-expect-error product variants must include merchandise fields selected by cart lines.
createProductServerHandlers({ cartHandlers, fragment: incompatibleProductFragment });

describe("createProductServerHandlers", () => {
  it("carries custom product fields from the product fragment", () => {
    type HandlerResult = Awaited<ReturnType<typeof productHandlers.get>>;
    type ProductData = NonNullable<HandlerResult["data"]["product"]>;
    type ProductFromHandlers = ProductDataFromHandlers<typeof productHandlers>;
    type SelectedVariant = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;

    expectTypeOf<ProductData>().toHaveProperty("description").toEqualTypeOf<string>();
    expectTypeOf<ProductFromHandlers>().toEqualTypeOf<ProductData>();
    expectTypeOf<SelectedVariant>()
      .toHaveProperty("currentlyNotInStock")
      .toEqualTypeOf<boolean>();
  });
});
