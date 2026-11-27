import { describe, expectTypeOf, it } from "vitest";

import {
  createProductFormRegister,
  type ProductOptionValueAttributes,
  type ProductOptionValueProps,
} from "./form";

describe("createProductFormRegister", () => {
  it("types option value fields by whether it has a select function", () => {
    const opts = { optionName: "Color", value: "Red" };

    expectTypeOf(
      createProductFormRegister(null, () => {})("optionValue", opts),
    ).toEqualTypeOf<ProductOptionValueProps>();
    expectTypeOf(
      createProductFormRegister(null)("optionValue", opts),
    ).toEqualTypeOf<ProductOptionValueAttributes>();
  });
});
