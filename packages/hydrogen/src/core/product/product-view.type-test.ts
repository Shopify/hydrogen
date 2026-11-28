import { describe, expectTypeOf, it } from "vitest";

import type { ProductViewProduct } from "./product-view";
import type { ProductInput } from "./state";

describe("product view types", () => {
  it("accepts the product form input", () => {
    expectTypeOf<ProductInput>().toMatchTypeOf<ProductViewProduct>();
  });
});
