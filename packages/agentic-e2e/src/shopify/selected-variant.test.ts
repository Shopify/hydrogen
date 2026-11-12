import { describe, expect, it } from "vitest";

import { selectedVariant, type VariantField } from "./selected-variant.ts";

const MEDIUM = "gid://shopify/ProductVariant/21";
const LARGE = "gid://shopify/ProductVariant/22";
const OTHER_PRODUCT = "gid://shopify/ProductVariant/99";
const VARIANT_IDS = [MEDIUM, LARGE];

describe("selectedVariant", () => {
  it.each<{ case: string; fields: VariantField[]; variantId: string }>([
    { case: "a Hydrogen merchandiseId GID", fields: [merchandiseId(LARGE)], variantId: LARGE },
    { case: "a numeric Liquid id", fields: [liquidId("21")], variantId: MEDIUM },
    {
      case: "fields that agree on one variant",
      fields: [merchandiseId(MEDIUM), liquidId("21"), merchandiseId(MEDIUM)],
      variantId: MEDIUM,
    },
    {
      case: "a known ID next to an ID of another product",
      fields: [merchandiseId(OTHER_PRODUCT), liquidId("22"), liquidId("99")],
      variantId: LARGE,
    },
  ])("selects the variant for $case", ({ fields, variantId }) => {
    expect(selectedVariant(fields, VARIANT_IDS)).toEqual({ status: "selected", variantId });
  });

  it("is unknown when the fields select different variants of the product", () => {
    expect(selectedVariant([merchandiseId(MEDIUM), liquidId("22")], VARIANT_IDS)).toEqual({
      status: "unknown",
      reason: `The selected variant is unknown: Product forms hold different variants of the product: ${MEDIUM}, ${LARGE}.`,
    });
  });

  it("is unknown when no field holds an examined variant of the product", () => {
    expect(selectedVariant([merchandiseId(OTHER_PRODUCT), liquidId("99")], VARIANT_IDS)).toEqual({
      status: "unknown",
      reason:
        "The selected variant is unknown: No product form holds the ID of an examined variant of the product.",
    });
  });

  it.each<VariantField>([
    merchandiseId(""),
    merchandiseId("22"),
    merchandiseId("gid://shopify/Product/22"),
    merchandiseId(`${LARGE}?selling_plan=1`),
    liquidId(""),
    liquidId(LARGE),
    liquidId("22 "),
    liquidId("Large"),
  ])("is unknown for the malformed field %j, also next to a known ID", (malformed) => {
    expect(selectedVariant([merchandiseId(LARGE), malformed], VARIANT_IDS)).toEqual({
      status: "unknown",
      reason: `The selected variant is unknown: A product form ${malformed.name} field holds ${JSON.stringify(malformed.value)}, which is not a variant ID.`,
    });
  });
});

function merchandiseId(value: string): VariantField {
  return { name: "merchandiseId", value };
}

function liquidId(value: string): VariantField {
  return { name: "id", value };
}
