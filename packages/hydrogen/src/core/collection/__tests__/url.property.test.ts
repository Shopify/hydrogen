import * as fc from "fast-check";
import { describe, it, expect, expectTypeOf } from "vitest";

import type { ProductFilter } from "../../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../../graphql/generated/storefront-api-types";
import {
  type CollectionParams,
  filterEquals,
  getSortByValue,
  isDirectionalSortKey,
  parseCollectionParams,
  parseSortByValue,
  serializeCollectionParams,
} from "../url";

const URL_CHARS = [
  ..."abcdefghijklmnopqrstuvwxyz0123456789",
  "&",
  "=",
  ".",
  "+",
  "%",
  "/",
  " ",
  "ñ",
  "ü",
  "漢",
  "€",
];

const filterString = fc.string({ unit: fc.constantFrom(...URL_CHARS), maxLength: 20 });
const nonEmptyFilterString = fc.string({
  unit: fc.constantFrom(...URL_CHARS),
  minLength: 1,
  maxLength: 20,
});

// Namespaces are parsed with `[^.]+` and encodeURIComponent leaves dots alone,
// so a dotted namespace cannot round-trip. Shopify namespaces never contain dots.
const namespaceString = fc.string({
  unit: fc.constantFrom(...URL_CHARS.filter((c) => c !== ".")),
  minLength: 1,
  maxLength: 15,
});

// Integer cents over 100 keeps String(n) free of exponent notation and float
// noise, so parseLocalizedNumber reads the value back exactly.
const price = fc.integer({ min: 0, max: 99_999_999 }).map((n) => n / 100);

// parseCollectionSortKey recognizes only the Standard Events sort values.
// ID, RELEVANCE, and COLLECTION_DEFAULT round-trip through parseSortByValue
// alone, which the second test covers.
const ROUND_TRIP_SORT_KEYS = [
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

// An empty option name serializes to the bare key `filter.v.option.`, which
// the parser does not read.
const variantOptionFilter = fc
  .tuple(nonEmptyFilterString, filterString)
  .map(([name, value]): ProductFilter => ({ variantOption: { name, value } }));

const productMetafieldFilter = fc
  .tuple(namespaceString, nonEmptyFilterString, filterString)
  .map(
    ([namespace, key, value]): ProductFilter => ({ productMetafield: { namespace, key, value } }),
  );

const variantMetafieldFilter = fc
  .tuple(namespaceString, nonEmptyFilterString, filterString)
  .map(
    ([namespace, key, value]): ProductFilter => ({ variantMetafield: { namespace, key, value } }),
  );

// serializeFilter splits the taxonomy key on its first dot and the parser reads
// it back as `[^.]+` `.` `.+`, so both halves must be non-empty and the first dot-free.
const taxonomyMetafieldFilter = fc
  .tuple(namespaceString, nonEmptyFilterString, nonEmptyFilterString)
  .map(
    ([ns, subkey, value]): ProductFilter => ({
      taxonomyMetafield: { key: `${ns}.${subkey}`, value },
    }),
  );

// No category filter. serializeCollectionParams emits filter.p.category, which
// parseCollectionParams does not read.
const repeatableFilter = fc.oneof(
  tagFilter,
  productTypeFilter,
  productVendorFilter,
  variantOptionFilter,
  productMetafieldFilter,
  variantMetafieldFilter,
  taxonomyMetafieldFilter,
);

// At most one availability filter, because both directions at once parse to none.
// At most one price filter, because the parser reads gte/lte with get, not getAll.
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

// reverse is only meaningful for directional sort keys; the store normalizes it
// to false otherwise, so the generator does the same.
const collectionParams = fc
  .tuple(
    filterList,
    fc.option(fc.constantFrom(...ROUND_TRIP_SORT_KEYS), { nil: undefined }),
    fc.boolean(),
  )
  .map(
    ([filters, sortKey, reverse]): CollectionParams => ({
      filters,
      sortKey,
      reverse: sortKey !== undefined && isDirectionalSortKey(sortKey) ? reverse : false,
    }),
  );

// The parser emits filters in a fixed kind order, so order is not part of the promise.
function filtersMatchAsMultiset(a: ProductFilter[], b: ProductFilter[]): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  for (const filter of a) {
    const idx = remaining.findIndex((candidate) => filterEquals(filter, candidate));
    if (idx === -1) return false;
    remaining.splice(idx, 1);
  }
  return true;
}

describe("collection URL round-trip properties", () => {
  it("parseCollectionParams(serializeCollectionParams(p)) equals p", () => {
    fc.assert(
      fc.property(collectionParams, (p) => {
        const result = parseCollectionParams(serializeCollectionParams(p));
        expect(result.sortKey).toBe(p.sortKey);
        expect(result.reverse).toBe(p.reverse);
        expect(filtersMatchAsMultiset(result.filters, p.filters)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("parseSortByValue(getSortByValue(k, r)) returns k, keeping r only for directional keys", () => {
    expectTypeOf<
      Exclude<ProductCollectionSortKeys, (typeof ALL_SORT_KEYS)[number]>
    >().toEqualTypeOf<never>();

    for (const sortKey of ALL_SORT_KEYS) {
      for (const reverse of [false, true]) {
        expect(parseSortByValue(getSortByValue(sortKey, reverse))).toEqual({
          sortKey,
          reverse: isDirectionalSortKey(sortKey) && reverse,
        });
      }
    }
  });
});
