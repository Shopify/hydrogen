import { expectTypeOf, it } from "vitest";

import {
  getFilterValueAttributes,
  type AvailableFilter,
  type AvailableFilterValue,
  type SignifierAttributes,
} from "../index";

it("accepts a full filter value and exports the same getter from each binding", () => {
  const value: AvailableFilterValue = { id: "value-id", label: "Blue", count: 3, input: "{}" };
  const attributes = getFilterValueAttributes(value);
  expectTypeOf(attributes).toEqualTypeOf<SignifierAttributes<"collection-filter-value">>();
  expectTypeOf(attributes["data-shopify-testid"]).toEqualTypeOf<"collection-filter-value">();
  expectTypeOf<keyof typeof attributes>().toEqualTypeOf<
    "data-shopify-testid" | "data-shopify-filter-id"
  >();
  expectTypeOf<typeof import("../../react").getFilterValueAttributes>().toEqualTypeOf<
    typeof getFilterValueAttributes
  >();
  expectTypeOf<typeof import("../../vue").getFilterValueAttributes>().toEqualTypeOf<
    typeof getFilterValueAttributes
  >();

  function InvalidConsumer(filter: AvailableFilter) {
    // @ts-expect-error a parent filter is not a filter value
    getFilterValueAttributes(filter);
    // @ts-expect-error an ID alone cannot distinguish a parent filter from its value
    getFilterValueAttributes({ id: "value-id" });
  }
  void InvalidConsumer;
});
