import { describe, expectTypeOf, it } from "vitest";

import {
  createPredictiveSearchServerHandlers,
  type PredictiveSearchDataFromHandlers,
} from "../core/index";
import { gql } from "../graphql";
import { usePredictiveSearch } from "./predictive-search";

const predictiveSearchHandlers = createPredictiveSearchServerHandlers({
  fragments: {
    product: gql(`
      fragment PredictiveSearchProductFragment on Product {
        vendor
      }
    `),
  },
});

type SearchData = PredictiveSearchDataFromHandlers<typeof predictiveSearchHandlers>;

describe("predictive search Vue types", () => {
  it("types state from custom predictive search server handlers", () => {
    function Consumer() {
      const state = usePredictiveSearch<SearchData>();
      type Product = (typeof state.value)["result"]["items"]["products"][number];

      expectTypeOf<Product["vendor"]>().toEqualTypeOf<string>();
    }

    void Consumer;
  });

  it("types selectors from custom predictive search server handlers", () => {
    function Consumer() {
      const vendor = usePredictiveSearch<SearchData, string>(
        (state) => state.result.items.products[0]?.vendor ?? "",
      );

      expectTypeOf(vendor.value).toEqualTypeOf<string>();
    }

    void Consumer;
  });
});
