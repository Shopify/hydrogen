import { expectTypeOf, it } from "vitest";

import { getProductCardAttributes, type SignifierAttributes } from "../index";

it("exports the same stateless card getter from core, React, and Vue", () => {
  const attributes = getProductCardAttributes({ handle: "blue-shirt" });
  expectTypeOf(attributes).toEqualTypeOf<SignifierAttributes<"product-card">>();
  expectTypeOf(attributes["data-shopify-testid"]).toEqualTypeOf<"product-card">();
  expectTypeOf<keyof typeof attributes>().toEqualTypeOf<
    "data-shopify-testid" | "data-shopify-product-handle"
  >();
  expectTypeOf<typeof import("../../react").getProductCardAttributes>().toEqualTypeOf<
    typeof getProductCardAttributes
  >();
  expectTypeOf<typeof import("../../vue").getProductCardAttributes>().toEqualTypeOf<
    typeof getProductCardAttributes
  >();

  function InvalidConsumer() {
    // @ts-expect-error a product ID does not replace the handle
    getProductCardAttributes({ id: "gid://shopify/Product/1" });
    // @ts-expect-error handles must be strings
    getProductCardAttributes({ handle: 1 });
  }
  void InvalidConsumer;
});
