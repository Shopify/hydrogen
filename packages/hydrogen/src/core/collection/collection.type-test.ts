import { describe, expectTypeOf, it } from "vitest";

import type { AvailableFilter, AvailableFilterValue } from "./state";

type BaseFilterValue = {
  id: string;
  label: string;
  count: number;
  input: string;
};

type QuerySwatch = {
  color?: string | null;
  image?: { previewImage?: { url: string } | null } | null;
} | null;

type ValueWithSwatch = BaseFilterValue & {
  swatch: QuerySwatch;
};

describe("collection filter types", () => {
  it("preserves swatch only when selected by the query value type", () => {
    expectTypeOf<AvailableFilterValue>().toEqualTypeOf<BaseFilterValue>();

    // @ts-expect-error swatch is not available unless the query value type selects it.
    expectTypeOf<AvailableFilterValue["swatch"]>();

    expectTypeOf<AvailableFilterValue<ValueWithSwatch>["swatch"]>().toEqualTypeOf<QuerySwatch>();
    expectTypeOf<AvailableFilter<ValueWithSwatch>["values"][number]["swatch"]>().toEqualTypeOf<
      QuerySwatch
    >();
  });
});
