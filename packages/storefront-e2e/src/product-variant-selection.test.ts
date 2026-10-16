import { describe, expect, it } from "vitest";

import {
  resolveProductVariantSelection,
  type ProductVariantSelectionData,
} from "./product-variant-selection";

const product: ProductVariantSelectionData = {
  options: [
    { name: "Size", optionValues: [{ name: "Small" }, { name: "Large" }] },
    { name: "Color", optionValues: [{ name: "Red" }] },
  ],
  variants: [
    {
      id: "v-small",
      availableForSale: true,
      selectedOptions: [
        { name: "Size", value: "Small" },
        { name: "Color", value: "Red" },
      ],
    },
    {
      id: "v-large",
      availableForSale: false,
      selectedOptions: [
        { name: "Size", value: "Large" },
        { name: "Color", value: "Red" },
      ],
    },
  ],
};

describe("product variant selection", () => {
  it("resolves the expected variant ID when a singleton option has no rendered control", () => {
    const selection = new Map([["Size", "Large"]]);
    const variant = resolveProductVariantSelection(product, selection);
    expect(variant).toMatchObject({ id: "v-large", availableForSale: false });
    expect(selection.has("Color")).toBe(false);
  });

  it("also validates singleton controls when they are rendered", () => {
    expect(
      resolveProductVariantSelection(
        product,
        new Map([
          ["Size", "Small"],
          ["Color", "Red"],
        ]),
      ).id,
    ).toBe("v-small");
    expect(() =>
      resolveProductVariantSelection(
        product,
        new Map([
          ["Size", "Small"],
          ["Color", "Blue"],
        ]),
      ),
    ).toThrow("does not match a variant in the bounded discovery sample");
  });

  it("does not silently select the first ambiguous candidate", () => {
    const variant = product.variants[0];
    if (variant === undefined) throw new Error("The fixture needs a variant.");
    const ambiguous = { ...product, variants: [variant, { ...variant, id: "v-duplicate" }] };
    expect(() => resolveProductVariantSelection(ambiguous, new Map([["Size", "Small"]]))).toThrow(
      "Ambiguous discovered variants",
    );
  });

  it("requires a selected control for each editable option even when the sample shows one value", () => {
    const partialSample = {
      ...product,
      options: product.options.map((option) =>
        option.name === "Color"
          ? { name: "Color", optionValues: [{ name: "Red" }, { name: "Blue" }] }
          : option,
      ),
    };
    // Both sampled variants are red. That does not make Color a singleton.
    expect(() =>
      resolveProductVariantSelection(partialSample, new Map([["Size", "Small"]])),
    ).toThrow('Missing selected product-option-value control for editable option "Color"');
  });

  it("reports the bounded sample limit instead of guessing an unsampled variant ID", () => {
    expect(() =>
      resolveProductVariantSelection(product, new Map([["Size", "Extra Large"]])),
    ).toThrow("The sample may omit catalog variants");
  });
});
