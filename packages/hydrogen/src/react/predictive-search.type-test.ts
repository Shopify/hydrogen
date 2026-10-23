import { describe, expectTypeOf, it } from "vitest";

import {
  createPredictiveSearchServerHandlers,
  type PredictiveSearchDataFromHandlers,
} from "../core/index";
import { gql } from "../graphql";
import { usePredictiveSearch, usePredictiveSearchForm } from "./predictive-search";

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

describe("predictive search React types", () => {
  it("types state from custom predictive search server handlers", () => {
    function Consumer() {
      const state = usePredictiveSearch<SearchData>();
      type Product = (typeof state)["result"]["items"]["products"][number];

      expectTypeOf<Product["vendor"]>().toEqualTypeOf<string>();
    }

    void Consumer;
  });

  it("types selectors from custom predictive search server handlers", () => {
    function Consumer() {
      const vendor = usePredictiveSearch<SearchData, string>(
        (state) => state.result.items.products[0]?.vendor ?? "",
      );

      expectTypeOf(vendor).toEqualTypeOf<string>();
    }

    void Consumer;
  });

  it("types predictive search form registration", () => {
    function Consumer() {
      const { register } = usePredictiveSearchForm();

      register("query", { placeholder: "Search" });

      // @ts-expect-error predictive search only registers its query input
      register("term");

      // @ts-expect-error query input name is owned by the primitive
      register("query", { name: "term" });
    }

    void Consumer;
  });
});
