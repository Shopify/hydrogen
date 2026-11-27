import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import { getProductViewAttributes, type ProductViewProduct } from "../core/product/product-view";
import { useProductForm } from "./product";
import type { ProductViewProps } from "./product-view";

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

describe("react product form types", () => {
  it("types useProductForm results and register props", () => {
    function Consumer() {
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

    void Consumer;
  });
});

describe("react product view types", () => {
  type CardProduct = Pick<ProductViewProduct, "id" | "title" | "handle">;

  it("rejects the manual trigger in ProductView, and the helper options accept it", () => {
    expectTypeOf<ProductViewProps["trigger"]>().toEqualTypeOf<
      "connect" | "intersect" | "dialog" | undefined
    >();
    expectTypeOf<{
      product: CardProduct;
      context: "collection";
      trigger: "manual";
    }>().not.toMatchTypeOf<ProductViewProps>();
    expectTypeOf(getProductViewAttributes).toBeCallableWith({
      product: { id: "1", title: "Shirt", handle: "shirt" },
      context: "collection",
      trigger: "manual",
    });
  });

  it("keeps the context and product union", () => {
    expectTypeOf<{
      product: CardProduct;
      context: "collection";
      trigger: "connect";
    }>().toMatchTypeOf<ProductViewProps>();
    expectTypeOf<{ product: CardProduct; context: "page" }>().not.toMatchTypeOf<ProductViewProps>();
  });
});
