import assert from "node:assert/strict";
import test from "node:test";

import { setSelectedOption, variantSearch } from "./product-page.ts";

const product = { options: [{ name: "Color" }, { name: "Size" }] };
const selectedOptions = [
  { name: "Color", value: "Blue" },
  { name: "Size", value: "S" },
];
const currentSearch = "?campaign=spring&quantity=4&Color=Blue&Size=S";

test("changing either option preserves the other selection and unrelated query params", () => {
  const mediumBlue = setSelectedOption(selectedOptions, { name: "Size", value: "M" });
  assert.equal(
    variantSearch(product, mediumBlue, currentSearch),
    "?campaign=spring&quantity=4&Color=Blue&Size=M",
  );

  const smallRed = setSelectedOption(selectedOptions, { name: "Color", value: "Red" });
  assert.equal(
    variantSearch(product, smallRed, currentSearch),
    "?campaign=spring&quantity=4&Size=S&Color=Red",
  );

  const partialSelection = setSelectedOption([{ name: "Color", value: "Blue" }], {
    name: "Size",
    value: "M",
  });
  assert.equal(
    variantSearch(product, partialSelection, "?campaign=spring&quantity=4&Color=Blue"),
    "?campaign=spring&quantity=4&Color=Blue&Size=M",
  );
});
