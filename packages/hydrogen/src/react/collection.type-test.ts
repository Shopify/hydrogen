import { describe, expectTypeOf, it } from "vitest";

import type { CollectionActions as CoreCollectionActions } from "../core";
import type { CollectionActions as VueCollectionActions } from "../vue";
import type { CollectionActions } from "./index";

describe("react collection types", () => {
  it("re-exports the core CollectionActions type", () => {
    expectTypeOf<CollectionActions>().toEqualTypeOf<CoreCollectionActions>();
    expectTypeOf<CollectionActions>().toEqualTypeOf<VueCollectionActions>();
  });
});
