import assert from "node:assert/strict";
import test from "node:test";

import { toURLSearchParams } from "../lib/url-params.ts";

test("preserves repeated storefront filters and omits absent values", () => {
  const params = toURLSearchParams({
    color: ["red", "blue"],
    available: "true",
    cursor: undefined,
  });

  assert.deepEqual(
    [...params.entries()],
    [
      ["color", "red"],
      ["color", "blue"],
      ["available", "true"],
    ],
  );
});
