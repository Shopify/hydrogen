import { describe, expectTypeOf, it } from "vitest";

import type { PredictiveSearchActions as CorePredictiveSearchActions } from "../core";
import type { PredictiveSearchActions } from "./index";

describe("vue predictive search types", () => {
  it("re-exports the core PredictiveSearchActions type", () => {
    expectTypeOf<PredictiveSearchActions>().toEqualTypeOf<CorePredictiveSearchActions>();
  });
});
