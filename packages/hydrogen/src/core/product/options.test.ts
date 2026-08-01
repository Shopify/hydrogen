import { describe, expect, it } from "vitest";

import { getSelectedProductOptions, getVariantIdParam } from "./options";

describe("getSelectedProductOptions", () => {
  it("decodes special characters in option names and values", () => {
    const params = new URLSearchParams();
    params.set("Size & Fit", "M/L + Tall");
    params.set("Color/Tone", "Red & Blue");

    expect(getSelectedProductOptions({ searchParams: params })).toEqual([
      { name: "Size & Fit", value: "M/L + Tall" },
      { name: "Color/Tone", value: "Red & Blue" },
    ]);
  });

  it("filters special-character option names after decoding", () => {
    const params = new URLSearchParams();
    params.set("Size & Fit", "M/L + Tall");
    params.set("ref", "campaign");

    expect(
      getSelectedProductOptions({ searchParams: params, allowedOptionNames: ["Size & Fit"] }),
    ).toEqual([{ name: "Size & Fit", value: "M/L + Tall" }]);
  });

  it("returns no selected options when allowedOptionNames is empty", () => {
    const params = new URLSearchParams();
    params.set("Size", "M");

    expect(getSelectedProductOptions({ searchParams: params, allowedOptionNames: [] })).toEqual([]);
  });
});

describe("getVariantIdParam", () => {
  const gid = "gid://shopify/ProductVariant/41565182099480";

  it("normalizes the bare legacy id Liquid storefronts emit", () => {
    const params = new URLSearchParams("variant=41565182099480");

    expect(getVariantIdParam({ searchParams: params })).toBe(gid);
  });

  it("accepts a full Storefront API GID", () => {
    const params = new URLSearchParams();
    params.set("variant", gid);

    expect(getVariantIdParam({ searchParams: params })).toBe(gid);
  });

  it("returns null when the param is absent or empty", () => {
    expect(getVariantIdParam({ searchParams: new URLSearchParams() })).toBeNull();
    expect(getVariantIdParam({ searchParams: new URLSearchParams("variant=") })).toBeNull();
    expect(getVariantIdParam({ searchParams: new URLSearchParams("variant=%20") })).toBeNull();
  });

  it("rejects GIDs for other resource types so they can't reach node(id:)", () => {
    const params = new URLSearchParams();
    params.set("variant", "gid://shopify/Customer/1");

    expect(getVariantIdParam({ searchParams: params })).toBeNull();
  });

  it("rejects non-numeric and decorated ids", () => {
    for (const value of ["not-an-id", "41565182099480 OR 1=1", `${gid}?namespace=x`, "-1", "1.5"]) {
      const params = new URLSearchParams();
      params.set("variant", value);

      expect(getVariantIdParam({ searchParams: params })).toBeNull();
    }
  });

  it("uses the first value when the param repeats", () => {
    const params = new URLSearchParams("variant=41565182099480&variant=99999999999999");

    expect(getVariantIdParam({ searchParams: params })).toBe(gid);
  });
});
