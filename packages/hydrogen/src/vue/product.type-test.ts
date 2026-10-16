import { describe, expectTypeOf, it } from "vitest";

import type { SignifierAttributes } from "../core";
import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import {
  useProductForm,
  type ProductAddToCartProps,
  type ProductOptionValueProps,
  type ProductQuantityProps,
  type ProductQuantityDefaultProps,
} from "./index";

declare const store: ProductFormStore<ProductInput<ProductVariantInput>>;

describe("vue product form types", () => {
  it("types the add-to-cart signifier attributes", () => {
    function Consumer() {
      const addToCart = useProductForm(store).register("addToCart", {});

      expectTypeOf(addToCart).toEqualTypeOf<ProductAddToCartProps>();
      expectTypeOf(addToCart.name).toEqualTypeOf<"add-to-cart">();
      expectTypeOf(addToCart.type).toEqualTypeOf<"submit">();
      expectTypeOf(addToCart["data-shopify-testid"]).toEqualTypeOf<"product-add-to-cart">();
      expectTypeOf(addToCart["data-shopify-variant-id"]).toEqualTypeOf<string>();
      expectTypeOf(addToCart["data-shopify-available"]).toEqualTypeOf<string>();
      expectTypeOf<ProductAddToCartProps>().toExtend<SignifierAttributes<"product-add-to-cart">>();
      const { register } = useProductForm(store);
      const optionValue = register("optionValue", { optionName: "Color", value: "Red" });
      expectTypeOf(optionValue).toEqualTypeOf<ProductOptionValueProps>();
      expectTypeOf(optionValue["data-shopify-testid"]).toEqualTypeOf<"product-option-value">();
      expectTypeOf<ProductOptionValueProps>().toExtend<SignifierAttributes<"product-option-value">>();
      expectTypeOf(register("quantity", { value: 2 })).toEqualTypeOf<ProductQuantityProps>();
      expectTypeOf(register("quantity", { defaultValue: 2 })).toEqualTypeOf<ProductQuantityDefaultProps>();
      expectTypeOf(register("quantity", { defaultValue: 2 })["data-shopify-testid"]).toEqualTypeOf<"product-quantity">();
      expectTypeOf<ProductQuantityProps>().toExtend<SignifierAttributes<"product-quantity">>();
      expectTypeOf<ProductQuantityDefaultProps>().toExtend<SignifierAttributes<"product-quantity">>();
    }

    void Consumer;
  });
});
