import assert from "node:assert/strict";
import test from "node:test";

import { filterValueInputParamEntries } from "./filter-input.ts";

const validFilters = [
  { available: true },
  { category: { id: "gid://shopify/TaxonomyCategory/aa" } },
  { price: { min: 10 } },
  { price: { max: 20 } },
  { productMetafield: { namespace: "custom", key: "material" } },
  { productMetafield: { namespace: "custom", key: "material", value: "cotton" } },
  { productType: "Shirts" },
  { productVendor: "Shopify" },
  { tag: "summer" },
  { taxonomyMetafield: { key: "color", value: "red" } },
  { variantMetafield: { namespace: "custom", key: "finish" } },
  { variantMetafield: { namespace: "custom", key: "finish", value: "matte" } },
  { variantOption: { name: "Size" } },
  { variantOption: { name: "Size", value: "Large" } },
];

test("serializes every supported product filter shape", () => {
  for (const filter of validFilters) {
    const entries = filterValueInputParamEntries(JSON.stringify(filter));
    assert.ok(entries.length > 0, `Expected entries for ${JSON.stringify(filter)}`);
  }
});

test("rejects malformed or invalid product filter input", () => {
  const invalidInputs = [
    "{",
    "null",
    "[]",
    '{"__proto__":true}',
    '{"constructor":true}',
    '{"toString":true}',
    JSON.stringify({ unknown: true }),
    JSON.stringify({ price: { min: null } }),
    JSON.stringify({ productMetafield: { key: "material" } }),
    JSON.stringify({ taxonomyMetafield: { key: "color" } }),
    JSON.stringify({ variantOption: { name: "Size", value: 42 } }),
  ];

  for (const input of invalidInputs) {
    assert.deepEqual(filterValueInputParamEntries(input), []);
  }
});
