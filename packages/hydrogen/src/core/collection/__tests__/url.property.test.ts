import * as fc from "fast-check";
import { describe, it, expect, expectTypeOf } from "vitest";

import type { ProductFilter } from "../../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../../graphql/generated/storefront-api-types";
import {
  type CollectionParams,
  getSortByValue,
  isDirectionalSortKey,
  parseCollectionParams,
  parseSortByValue,
  serializeCollectionParams,
} from "../url";

// A wide alphabet dilutes the delimiters the parser splits on, so draw them half the time.
const delimiterHeavyChar = fc.oneof(
  fc.constantFrom(".", "&", "=", "+", "%", "/", " "),
  fc.string({ unit: "grapheme", minLength: 1, maxLength: 1 }),
);
const filterString = fc.string({ unit: delimiterHeavyChar, maxLength: 20 });
const nonEmptyFilterString = fc.string({ unit: delimiterHeavyChar, minLength: 1, maxLength: 20 });

// Namespaces are parsed with `[^.]+` and encodeURIComponent leaves dots alone,
// so a dotted namespace cannot round-trip. Shopify namespaces never contain dots.
const dotFreeNamespace = nonEmptyFilterString.filter((s) => !s.includes("."));

// String(-0) is "0", so negative zero cannot round-trip. No price is negative zero.
const price = fc.double({ noNaN: true }).map((n) => (n === 0 ? 0 : n));

const LIQUID_SORT_KEYS = [
  "BEST_SELLING",
  "CREATED",
  "MANUAL",
  "PRICE",
  "TITLE",
] as const satisfies readonly ProductCollectionSortKeys[];

const ALL_SORT_KEYS = [
  "BEST_SELLING",
  "COLLECTION_DEFAULT",
  "CREATED",
  "ID",
  "MANUAL",
  "PRICE",
  "RELEVANCE",
  "TITLE",
] as const satisfies readonly ProductCollectionSortKeys[];

const EXPECTED_DIRECTIONAL_SORT_KEYS = new Set<ProductCollectionSortKeys>([
  "CREATED",
  "ID",
  "PRICE",
  "TITLE",
]);

const tagFilter = filterString.map((tag): ProductFilter => ({ tag }));
const productTypeFilter = filterString.map((productType): ProductFilter => ({ productType }));
const productVendorFilter = filterString.map((productVendor): ProductFilter => ({ productVendor }));
const availableFilter = fc.boolean().map((available): ProductFilter => ({ available }));

const priceFilter = fc
  .record({
    min: fc.option(price, { nil: undefined }),
    max: fc.option(price, { nil: undefined }),
  })
  .filter((p) => p.min !== undefined || p.max !== undefined)
  .map((p): ProductFilter => ({ price: p }));

const variantOptionFilter = fc
  .tuple(nonEmptyFilterString, filterString)
  .map(([name, value]): ProductFilter => ({ variantOption: { name, value } }));

const productMetafieldFilter = fc
  .tuple(dotFreeNamespace, nonEmptyFilterString, filterString)
  .map(
    ([namespace, key, value]): ProductFilter => ({ productMetafield: { namespace, key, value } }),
  );

const variantMetafieldFilter = fc
  .tuple(dotFreeNamespace, nonEmptyFilterString, filterString)
  .map(
    ([namespace, key, value]): ProductFilter => ({ variantMetafield: { namespace, key, value } }),
  );

const taxonomyMetafieldFilter = fc
  .tuple(dotFreeNamespace, nonEmptyFilterString, nonEmptyFilterString)
  .map(
    ([ns, subkey, value]): ProductFilter => ({
      taxonomyMetafield: { key: `${ns}.${subkey}`, value },
    }),
  );

const repeatableFilter = fc.oneof(
  tagFilter,
  productTypeFilter,
  productVendorFilter,
  variantOptionFilter,
  productMetafieldFilter,
  variantMetafieldFilter,
  taxonomyMetafieldFilter,
);

const filterList = fc
  .tuple(
    fc.option(availableFilter, { nil: undefined }),
    fc.option(priceFilter, { nil: undefined }),
    fc.array(repeatableFilter, { maxLength: 6 }),
  )
  .map(([available, priceRange, rest]): ProductFilter[] => [
    ...(available ? [available] : []),
    ...(priceRange ? [priceRange] : []),
    ...rest,
  ]);

const collectionParams = fc
  .tuple(
    filterList,
    fc.option(fc.constantFrom(...LIQUID_SORT_KEYS), { nil: undefined }),
    fc.boolean(),
  )
  .map(
    ([filters, sortKey, reverse]): CollectionParams => ({
      filters,
      sortKey,
      reverse:
        sortKey !== undefined && EXPECTED_DIRECTIONAL_SORT_KEYS.has(sortKey) ? reverse : false,
    }),
  );

// The parser emits filters in a fixed kind order, so filter order is not part of the promise.
function canonicalOrder(filters: ProductFilter[]): ProductFilter[] {
  return filters.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

describe("collection URL round-trip properties", () => {
  it("parseCollectionParams(serializeCollectionParams(p)) equals p", () => {
    fc.assert(
      fc.property(collectionParams, (p) => {
        const result = parseCollectionParams(serializeCollectionParams(p));
        expect(result.sortKey).toBe(p.sortKey);
        expect(result.reverse).toBe(p.reverse);
        expect(canonicalOrder(result.filters)).toEqual(canonicalOrder(p.filters));
      }),
      { numRuns: 500 },
    );
  });

  it("parseSortByValue(getSortByValue(k, r)) returns k, keeping r only for the four directional keys", () => {
    expectTypeOf<
      Exclude<ProductCollectionSortKeys, (typeof ALL_SORT_KEYS)[number]>
    >().toEqualTypeOf<never>();

    for (const sortKey of ALL_SORT_KEYS) {
      expect(isDirectionalSortKey(sortKey)).toBe(EXPECTED_DIRECTIONAL_SORT_KEYS.has(sortKey));
      for (const reverse of [false, true]) {
        expect(parseSortByValue(getSortByValue(sortKey, reverse))).toEqual({
          sortKey,
          reverse: EXPECTED_DIRECTIONAL_SORT_KEYS.has(sortKey) && reverse,
        });
      }
    }
  });
});
