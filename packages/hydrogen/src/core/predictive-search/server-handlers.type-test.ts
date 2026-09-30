import { describe, expectTypeOf, it } from "vitest";

import { gql } from "../../graphql";
import type { PredictiveSearchData, PredictiveSearchDataFromHandlers } from "../index";
import type { PredictiveSearchDataForOptions } from "./search";
import { createPredictiveSearchServerHandlers } from "./server-handlers";

const customProductFragment = gql(`
  fragment PredictiveSearchProductFragment on Product {
    vendor
  }
`);

const customHandlers = createPredictiveSearchServerHandlers({
  fragments: {
    product: customProductFragment,
  },
});
const defaultHandlers = createPredictiveSearchServerHandlers();

// Keep this at module scope. TypeScript relates two PredictiveSearchDataForOptions<…> instantiations by
// the alias's measured variance, which treats different fragment options as identical. A module-scope
// alias gets its own name and forces a structural check; a callback-local alias does not.
type CustomData = PredictiveSearchDataForOptions<{
  readonly fragments: {
    readonly product: typeof customProductFragment;
  };
}>;

describe("createPredictiveSearchServerHandlers type tests", () => {
  it("carries custom fragment data through handler get results", () => {
    type Product = PredictiveSearchDataFromHandlers<
      typeof customHandlers
    >["items"]["products"][number];

    expectTypeOf<Product["vendor"]>().toEqualTypeOf<string>();
  });

  it("matches PredictiveSearchDataForOptions", () => {
    expectTypeOf<
      PredictiveSearchDataFromHandlers<typeof customHandlers>
    >().toEqualTypeOf<CustomData>();
  });

  it("infers the default data from handlers without custom fragments", () => {
    expectTypeOf<
      PredictiveSearchDataFromHandlers<typeof defaultHandlers>
    >().toEqualTypeOf<PredictiveSearchData>();
  });

  it("keeps data from different handlers distinct", () => {
    expectTypeOf<
      PredictiveSearchDataFromHandlers<typeof defaultHandlers>
    >().not.toEqualTypeOf<PredictiveSearchDataFromHandlers<typeof customHandlers>>();
  });

  it("rejects default data where custom fragment data is required", () => {
    expectTypeOf<
      PredictiveSearchDataFromHandlers<typeof defaultHandlers>
    >().not.toExtend<PredictiveSearchDataFromHandlers<typeof customHandlers>>();
  });

  it("only accepts handler objects", () => {
    // @ts-expect-error PredictiveSearchDataFromHandlers infers from a handlers object's `get`.
    type NotHandlers = PredictiveSearchDataFromHandlers<typeof customProductFragment>;

    expectTypeOf<NotHandlers>().toBeNever();
  });

  it("rejects handlers from other domains", () => {
    type CartLikeHandlers = {
      get: (context: never) => Promise<{ type: "json"; data: { cart: null } }>;
    };

    // @ts-expect-error Only predictive search handlers produce predictive search data.
    type OtherDomainData = PredictiveSearchDataFromHandlers<CartLikeHandlers>;

    expectTypeOf<OtherDomainData>().toBeNever();
  });
});
