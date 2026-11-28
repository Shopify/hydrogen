import { describe, expectTypeOf, it } from "vitest";

import type { ProductFilter as StorefrontProductFilter } from "../../graphql/generated/storefront-api-types";
import type { CollectionViewCollection, CollectionViewOptions } from "./collection-view";
import type { AvailableFilter, AvailableFilterValue, CollectionState } from "./state";
import type { CollectionParams } from "./url";

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
  it("uses Storefront API product filters for collection state and URL params", () => {
    expectTypeOf<CollectionState["filters"]>().toEqualTypeOf<StorefrontProductFilter[]>();
    expectTypeOf<CollectionParams["filters"]>().toEqualTypeOf<StorefrontProductFilter[]>();
  });

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

describe("collection view types", () => {
  it("accepts a full query type", () => {
    expectTypeOf<{
      collection: { id: string; handle: string; title: string; products: { nodes: [] } };
      productsCount: number;
    }>().toMatchTypeOf<CollectionViewOptions>();
    expectTypeOf<{ id: null; handle: string }>().toMatchTypeOf<CollectionViewCollection>();
  });

  it("requires the collection ID", () => {
    // @ts-expect-error a query that forgets `id` must fail typechecking.
    expectTypeOf<{ handle: string }>().toMatchTypeOf<CollectionViewCollection>();
  });
});
