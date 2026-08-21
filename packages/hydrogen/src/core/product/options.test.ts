import { describe, expect, it } from "vitest";

import { getSelectedProductOptions } from "./options";

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

  it("never treats the reserved variant param as an option", () => {
    const params = new URLSearchParams();
    params.set("variant", "41820371452004");
    params.set("Size", "M");

    expect(getSelectedProductOptions({ searchParams: params })).toEqual([
      { name: "Size", value: "M" },
    ]);
    expect(
      getSelectedProductOptions({ searchParams: params, allowedOptionNames: ["variant", "Size"] }),
    ).toEqual([{ name: "Size", value: "M" }]);
  });
});
