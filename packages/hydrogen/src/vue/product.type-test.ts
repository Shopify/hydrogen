import { describe, expectTypeOf, it } from "vitest";

import type { SignifierAttributes } from "../core";
import type { ProductFormStore, ProductInput, ProductVariantInput } from "../core/product";
import { useProductForm, type ProductAddToCartProps } from "./index";

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
    }

    void Consumer;
  });
});
