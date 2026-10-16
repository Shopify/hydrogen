// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { getFilterValueAttributes } from "./form";
import type { AvailableFilter, AvailableFilterValue } from "./state";

const value: AvailableFilterValue = {
  id: "filter.v.option.color.blue",
  label: "Blue",
  count: 3,
  input: '{"variantOption":{"name":"Color","value":"Blue"}}',
};

describe("getFilterValueAttributes", () => {
  it("uses the Storefront API value ID, not the parent filter ID", () => {
    const filter: AvailableFilter = {
      id: "filter.v.option.color",
      label: "Color",
      type: "LIST",
      values: [value],
    };
    expect(getFilterValueAttributes(value)).toEqual({
      "data-shopify-testid": "collection-filter-value",
      "data-shopify-filter-id": value.id,
    });
    expect(getFilterValueAttributes(value)["data-shopify-filter-id"]).not.toBe(filter.id);
  });

  it("leaves checked state, form values, and native labeling with the caller", () => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "filter.v.option.color";
    checkbox.value = "Blue";
    label.append(checkbox, "Blue");
    for (const [name, attributeValue] of Object.entries(getFilterValueAttributes(value))) {
      checkbox.setAttribute(name, attributeValue);
    }

    checkbox.click();

    expect(checkbox.checked).toBe(true);
    expect(checkbox.name).toBe("filter.v.option.color");
    expect(checkbox.value).toBe("Blue");
    expect(checkbox.labels?.[0]).toBe(label);
    expect(checkbox.disabled).toBe(false);
    expect(checkbox.hasAttribute("aria-checked")).toBe(false);
    expect(checkbox.hasAttribute("checked")).toBe(false);
  });
});
