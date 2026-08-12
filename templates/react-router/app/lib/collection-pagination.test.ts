import assert from "node:assert/strict";
import test from "node:test";

import { mergeProductWindow, type ProductWindow } from "./collection-pagination.ts";

type Product = { id: string };

function window(
  ids: string[],
  start: string,
  end: string,
  { hasPreviousPage = true, hasNextPage = true } = {},
): ProductWindow<Product> {
  return {
    products: ids.map((id) => ({ id })),
    pageInfo: {
      startCursor: start,
      endCursor: end,
      hasPreviousPage,
      hasNextPage,
    },
  };
}

test("appends unique products and advances only the end boundary", () => {
  const result = mergeProductWindow(
    window(["one", "two"], "start-1", "end-1", {
      hasPreviousPage: false,
      hasNextPage: true,
    }),
    window(["two", "three"], "start-2", "end-2", {
      hasPreviousPage: true,
      hasNextPage: false,
    }),
    "next",
  );

  assert.deepEqual(
    result.window.products.map((product) => product.id),
    ["one", "two", "three"],
  );
  assert.equal(result.window.pageInfo.startCursor, "start-1");
  assert.equal(result.window.pageInfo.endCursor, "end-2");
  assert.equal(result.window.pageInfo.hasPreviousPage, false);
  assert.equal(result.window.pageInfo.hasNextPage, false);
  assert.equal(result.firstAddedProductId, "three");
});

test("prepends unique products and advances only the start boundary", () => {
  const result = mergeProductWindow(
    window(["three", "four"], "start-2", "end-2", {
      hasPreviousPage: true,
      hasNextPage: false,
    }),
    window(["one", "three"], "start-1", "end-1", {
      hasPreviousPage: false,
      hasNextPage: true,
    }),
    "previous",
  );

  assert.deepEqual(
    result.window.products.map((product) => product.id),
    ["one", "three", "four"],
  );
  assert.equal(result.window.pageInfo.startCursor, "start-1");
  assert.equal(result.window.pageInfo.endCursor, "end-2");
  assert.equal(result.window.pageInfo.hasPreviousPage, false);
  assert.equal(result.window.pageInfo.hasNextPage, false);
  assert.equal(result.firstAddedProductId, "one");
});
