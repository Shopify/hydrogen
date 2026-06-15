import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { describe, expectTypeOf, it } from "vitest";

import { createCartServerHandlers } from "../core/cart";
import type { ProductInput, ProductVariantInput } from "../core/product";
import { createProductServerHandlers } from "../core/product";
import { gql } from "../graphql";
import { createProductComponents } from "./product";

const defaultProduct = createProductComponents<ProductInput<ProductVariantInput>>();

export function productFormTypes() {
  const result = defaultProduct.useProductForm();
  const { register } = result;

  expectTypeOf(result.selectedVariant).toEqualTypeOf<ProductVariantInput | null>();

  const merchandiseProps: InputHTMLAttributes<HTMLInputElement> = {
    type: "hidden",
    ...register("merchandiseId", {}),
  };
  expectTypeOf(merchandiseProps.name).toEqualTypeOf<string | undefined>();

  const quantityProps: InputHTMLAttributes<HTMLInputElement> = {
    type: "number",
    ...register("quantity", { value: 1 }),
  };
  expectTypeOf(quantityProps.value).toEqualTypeOf<
    string | number | readonly string[] | undefined
  >();

  const radioProps: InputHTMLAttributes<HTMLInputElement> = {
    type: "radio",
    checked: true,
    disabled: false,
    ...register("optionValue", { optionName: "Color", value: "Red" }),
  };
  expectTypeOf(radioProps.checked).toEqualTypeOf<boolean | undefined>();

  const buttonProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    "aria-pressed": true,
    disabled: false,
    ...register("optionValue", { optionName: "Color", value: "Red" }),
  };
  expectTypeOf(buttonProps["aria-pressed"]).toEqualTypeOf<
    ButtonHTMLAttributes<HTMLButtonElement>["aria-pressed"]
  >();

  // @ts-expect-error product register only accepts product-relevant fields
  register("add");

  // @ts-expect-error merchandiseId takes its params in the second argument
  register("merchandiseId");

  // @ts-expect-error arbitrary option names are registered through "optionValue"
  register("Color", { value: "Red" });

  // @ts-expect-error optionValue requires optionName
  register("optionValue", { value: "Red" });
}

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
  it("derives React product props and hooks from product server handlers", () => {
    type ProductProviderProps = Parameters<typeof typedProduct.ProductProvider>[0];
    type ProductData = ProductProviderProps["product"];
    type SelectedVariant = NonNullable<
      ReturnType<typeof typedProduct.useProduct>["selectedVariant"]
    >;

    expectTypeOf<ProductData>().toHaveProperty("description").toEqualTypeOf<string>();
    expectTypeOf<SelectedVariant>().toHaveProperty("currentlyNotInStock").toEqualTypeOf<boolean>();
  });
});
