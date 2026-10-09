import { describe, expectTypeOf, it } from "vitest";

import { gql } from "../../graphql";
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

describe("createPredictiveSearchServerHandlers type tests", () => {
  it("carries custom fragment data through handler get results", () => {
    type Result = Awaited<ReturnType<typeof customHandlers.get>>;
    type Data = Extract<Result, { type: "json" }> extends { data: infer TData } ? TData : never;
    type Product = Data extends { items: { products: Array<infer TProduct> } } ? TProduct : never;

    expectTypeOf<Product>().toHaveProperty("vendor");
  });

  it("matches PredictiveSearchDataForOptions", () => {
    type Data = PredictiveSearchDataForOptions<{
      readonly fragments: {
        readonly product: typeof customProductFragment;
      };
    }>;
    type HandlerResult = Awaited<ReturnType<typeof customHandlers.get>>;
    type HandlerData = Extract<HandlerResult, { type: "json" }> extends { data: infer TData }
      ? TData
      : never;

    expectTypeOf<HandlerData>().toEqualTypeOf<Data>();
  });
});
