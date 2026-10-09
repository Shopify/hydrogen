import { describe, expect, it } from "vitest";

import { buildProductSelectionSearchParams } from "./url";

const SELECTED_OPTIONS = [
  { name: "Color", value: "Red" },
  { name: "Size", value: "M" },
];

describe("buildProductSelectionSearchParams", () => {
  it("writes one param per selected option by default", () => {
    const params = buildProductSelectionSearchParams({
      selectedOptions: SELECTED_OPTIONS,
      optionNames: ["Color", "Size"],
    });

    expect(params.toString()).toBe("Color=Red&Size=M");
  });

  it("writes a numeric variant param for the variant style", () => {
    const params = buildProductSelectionSearchParams({
      style: "variant",
      selectedOptions: SELECTED_OPTIONS,
      variant: { id: "gid://shopify/ProductVariant/41820371452004" },
      optionNames: ["Color", "Size"],
    });

    expect(params.toString()).toBe("variant=41820371452004");
  });

  it("falls back to option params when the variant style has no resolved variant", () => {
    const params = buildProductSelectionSearchParams({
      style: "variant",
      selectedOptions: [{ name: "Color", value: "Red" }],
      variant: null,
      optionNames: ["Color", "Size"],
    });

    expect(params.toString()).toBe("Color=Red");
  });

  it("falls back to option params for non-canonical variant ids", () => {
    const params = buildProductSelectionSearchParams({
      style: "variant",
      selectedOptions: SELECTED_OPTIONS,
      variant: { id: "gid://shopify/ProductVariant/not-numeric" },
      optionNames: ["Color", "Size"],
    });

    expect(params.toString()).toBe("Color=Red&Size=M");
  });

  it("removes stale variant and option params from base while preserving the rest", () => {
    const base = new URLSearchParams("variant=123&Color=Blue&Material=Wool&ref=campaign");

    const params = buildProductSelectionSearchParams({
      selectedOptions: SELECTED_OPTIONS,
      optionNames: ["Color", "Size", "Material"],
      base,
    });

    expect(params.toString()).toBe("ref=campaign&Color=Red&Size=M");
    expect(base.toString()).toBe("variant=123&Color=Blue&Material=Wool&ref=campaign");
  });

  it("removes params named after the target selection across combined-listing products", () => {
    const base = new URLSearchParams("Color=Blue&ref=campaign");

    const params = buildProductSelectionSearchParams({
      selectedOptions: [{ name: "Material", value: "Wool" }],
      optionNames: ["Color"],
      base,
    });

    expect(params.toString()).toBe("ref=campaign&Material=Wool");
  });

  it("removes stale option params when emitting a variant link", () => {
    const base = new URLSearchParams("Color=Blue&Size=S&ref=campaign");

    const params = buildProductSelectionSearchParams({
      style: "variant",
      selectedOptions: SELECTED_OPTIONS,
      variant: { id: "gid://shopify/ProductVariant/42" },
      optionNames: ["Color", "Size"],
      base,
    });

    expect(params.toString()).toBe("ref=campaign&variant=42");
  });
});
