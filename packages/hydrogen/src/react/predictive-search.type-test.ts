import { describe, expectTypeOf, it } from "vitest";

import type { PredictiveSearchData, PredictiveSearchState } from "../core/predictive-search";
import { usePredictiveSearch, usePredictiveSearchForm } from "./predictive-search";

type CustomPredictiveSearchData = PredictiveSearchData & {
  merchandising: {
    campaignId: string;
  };
};

describe("predictive search React types", () => {
  it("preserves caller-provided result data on state", () => {
    type State = PredictiveSearchState<CustomPredictiveSearchData>;

    expectTypeOf<State["result"]["merchandising"]["campaignId"]>().toEqualTypeOf<string>();
  });

  it("types selectors from caller-provided result data", () => {
    function Consumer() {
      const campaignId = usePredictiveSearch<CustomPredictiveSearchData, string>(
        (state) => state.result.merchandising.campaignId,
      );

      expectTypeOf(campaignId).toEqualTypeOf<string>();
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
