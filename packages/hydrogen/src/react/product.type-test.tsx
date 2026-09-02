import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { expectTypeOf } from "vitest";

import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import { useProductForm } from "./product";

declare const store: ProductFormStore<ProductInput<ProductVariantInput>>;

type ProductOptionValueSwatch = {
  color: string | null;
  image: { previewImage: { url: string } | null } | null;
} | null;
type ProductWithSwatches = Omit<ProductInput<ProductVariantInput>, "options"> & {
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
      firstSelectableVariant?: ProductVariantInput | null;
      swatch?: ProductOptionValueSwatch;
    }>;
  }>;
};
declare const swatchStore: ProductFormStore<ProductWithSwatches>;

export function productFormTypes() {
  const result = useProductForm(store);
  const { register } = result;

  expectTypeOf(result.selectedVariant).toEqualTypeOf<ProductVariantInput | null>();

  const swatchResult = useProductForm(swatchStore);
  expectTypeOf(swatchResult.options[0].values[0].swatch).toEqualTypeOf<
    ProductOptionValueSwatch | undefined
  >();

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

  const addToCartProps: ButtonHTMLAttributes<HTMLButtonElement> = {
    disabled: false,
    ...register("addToCart", {}),
  };
  expectTypeOf(addToCartProps.type).toEqualTypeOf<
    ButtonHTMLAttributes<HTMLButtonElement>["type"]
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
