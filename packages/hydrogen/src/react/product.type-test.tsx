import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { expectTypeOf } from "vitest";

import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import { useProductForm } from "./product";

declare const store: ProductFormStore<ProductInput<ProductVariantInput>>;

export function productFormTypes() {
  const result = useProductForm(store);
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
