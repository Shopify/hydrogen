import type { ProductFilter } from "../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";
import type { CollectionState } from "./state";

/**
 * Parsed collection URL parameters — the subset of {@link CollectionState}
 * that is derived from the URL query string.
 */
export interface CollectionParams {
  filters: ProductFilter[];
  sortKey: ProductCollectionSortKeys | undefined;
  reverse: boolean;
}

const SORT_BY_DESCENDING_SUFFIX = "-descending";
const SORT_BY_ASCENDING_SUFFIX = "-ascending";

const SORT_KEY_TO_SORT_BY: Record<string, string> = {
  BEST_SELLING: "best-selling",
  CREATED: "created",
  PRICE: "price",
  TITLE: "title",
  MANUAL: "manual",
  ID: "id",
  RELEVANCE: "relevance",
  COLLECTION_DEFAULT: "collection-default",
};

const SORT_BY_TO_SORT_KEY: Record<string, ProductCollectionSortKeys> = Object.fromEntries(
  Object.entries(SORT_KEY_TO_SORT_BY).map(([key, value]) => [
    value,
    key as ProductCollectionSortKeys,
  ]),
);

const STANDARD_EVENTS_COLLECTION_SORT_KEY: Record<string, ProductCollectionSortKeys> = {
  "best-selling": "BEST_SELLING",
  "created-ascending": "CREATED",
  "created-descending": "CREATED",
  "price-ascending": "PRICE",
  "price-descending": "PRICE",
  "title-ascending": "TITLE",
  "title-descending": "TITLE",
  manual: "MANUAL",
};

/**
 * Extracts collection state from URL search params.
 *
 * Handles Liquid-compatible filter keys (`filter.p.*`, `filter.v.*`)
 * and the `sort_by` param (with optional `-descending`/`-ascending` suffix).
 *
 * @param searchParams - URL search params to parse
 */
export function parseCollectionParams(searchParams: URLSearchParams): CollectionParams {
  const filters = parseProductFilters(searchParams);
  const sortKey = parseCollectionSortKey(searchParams);
  const rawSortBy = searchParams.get("sort_by");
  const reverse = rawSortBy?.endsWith(SORT_BY_DESCENDING_SUFFIX) ?? false;

  return { filters, sortKey, reverse };
}

/**
 * Serializes collection state into URL search params using Liquid-compatible keys.
 *
 * Only emits store-owned keys (`filter.*`, `sort_by`).
 * Omits `sort_by` when `sortKey` is `undefined` (collection default).
 *
 * @param state - The filter/sort slice of collection state
 */
export function serializeCollectionParams(
  state: Pick<CollectionState, "filters" | "sortKey" | "reverse">,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const filter of state.filters) {
    serializeFilter(params, filter);
  }

  if (state.sortKey) {
    params.set("sort_by", getSortByValue(state.sortKey, state.reverse));
  }

  return params;
}

/** Returns `true` when the param key is owned by the collection store. */
export function isStoreOwnedParam(key: string): boolean {
  return key === "sort_by" || key.startsWith("filter.");
}

/** Normalizes a router search string for comparison (strips a leading `?`). */
export function normalizeCollectionSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

/**
 * Merges store-owned params from `state` into `existing`, preserving
 * non-store keys (e.g. `grid`, `view`) already present in the URL.
 */
export function mergeCollectionParams(
  existing: URLSearchParams,
  state: Pick<CollectionState, "filters" | "sortKey" | "reverse">,
): URLSearchParams {
  const merged = new URLSearchParams(existing);

  for (const key of Array.from(merged.keys())) {
    if (isStoreOwnedParam(key)) {
      merged.delete(key);
    }
  }

  for (const [key, value] of serializeCollectionParams(state)) {
    merged.append(key, value);
  }

  return merged;
}

/** Returns `true` when two router search strings describe the same collection filters and sort. */
export function collectionSearchEqual(a: string, b: string): boolean {
  const parsedA = parseCollectionParams(new URLSearchParams(normalizeCollectionSearch(a)));
  const parsedB = parseCollectionParams(new URLSearchParams(normalizeCollectionSearch(b)));

  return (
    parsedA.sortKey === parsedB.sortKey &&
    parsedA.reverse === parsedB.reverse &&
    filtersEqual(parsedA.filters, parsedB.filters)
  );
}

/** Returns `true` when URL params and collection browse state describe the same filters and sort. */
export function collectionParamsMatchState(
  searchParams: URLSearchParams,
  state: Pick<CollectionState, "filters" | "sortKey" | "reverse">,
): boolean {
  const parsed = parseCollectionParams(searchParams);

  return (
    parsed.sortKey === state.sortKey &&
    parsed.reverse === state.reverse &&
    filtersEqual(parsed.filters, state.filters)
  );
}

/**
 * Builds a URL query string with the given filter removed from the current params.
 *
 * Returns `"?"` when removing the filter leaves no params. Useful for
 * rendering "remove filter" links without updating store state.
 */
export function getFilterRemovalUrl(currentParams: URLSearchParams, filter: ProductFilter): string {
  const result = new URLSearchParams(currentParams);
  removeFilterParams(result, filter);
  const serialized = result.toString();
  return serialized ? `?${serialized}` : "?";
}

/** Returns `true` when the sort key supports ascending/descending direction suffixes. */
export function isDirectionalSortKey(sortKey: ProductCollectionSortKeys): boolean {
  return sortKey === "PRICE" || sortKey === "TITLE" || sortKey === "CREATED" || sortKey === "ID";
}

/**
 * Converts a Storefront API sort key and direction into the Liquid-compatible
 * `sort_by` param value (e.g. `"price-ascending"`, `"best-selling"`).
 *
 * Direction suffixes are only appended for sort keys that support them
 * (`PRICE`, `TITLE`, `CREATED`, `ID`). Others (like `BEST_SELLING`) return
 * the base value regardless of the `reverse` flag.
 *
 * @param sortKey - Storefront API `ProductCollectionSortKeys` enum value
 * @param reverse - `true` for descending, `false` for ascending
 */
export function getSortByValue(sortKey: ProductCollectionSortKeys, reverse: boolean): string {
  const base = SORT_KEY_TO_SORT_BY[sortKey] ?? sortKey.toLowerCase();

  if (!isDirectionalSortKey(sortKey)) return base;

  return reverse ? `${base}-descending` : `${base}-ascending`;
}

/**
 * Parses a Liquid-compatible `sort_by` value back into the Storefront API
 * sort key and direction. Inverse of {@link getSortByValue}.
 *
 * @param value - A `sort_by` param value (e.g. `"price-ascending"`, `"best-selling"`)
 */
export function parseSortByValue(value: string): {
  sortKey: ProductCollectionSortKeys | undefined;
  reverse: boolean;
} {
  if (value.endsWith(SORT_BY_DESCENDING_SUFFIX)) {
    const base = value.slice(0, -SORT_BY_DESCENDING_SUFFIX.length);
    return { sortKey: SORT_BY_TO_SORT_KEY[base], reverse: true };
  }

  if (value.endsWith(SORT_BY_ASCENDING_SUFFIX)) {
    const base = value.slice(0, -SORT_BY_ASCENDING_SUFFIX.length);
    return { sortKey: SORT_BY_TO_SORT_KEY[base], reverse: false };
  }

  return { sortKey: SORT_BY_TO_SORT_KEY[value], reverse: false };
}

/**
 * Mirrors `parseProductFilters` from storefront-standard-events.
 *
 * Keep this local because Hydrogen only vendors Standard Events
 * declarations, so importing CollectionUpdateEvent would require runtime JS.
 */
function parseProductFilters(searchParams: URLSearchParams): ProductFilter[] {
  const filters: ProductFilter[] = [];
  const price: ProductFilter["price"] = {};
  const minPrice = searchParams.get("filter.v.price.gte");
  const maxPrice = searchParams.get("filter.v.price.lte");

  if (minPrice) price.min = parseLocalizedNumber(minPrice);
  if (maxPrice) price.max = parseLocalizedNumber(maxPrice);
  if (price.min !== undefined || price.max !== undefined) filters.push({ price });

  const availability = searchParams.getAll("filter.v.availability");
  const inStock = availability.includes("1");
  const outOfStock = availability.includes("0");
  if (inStock && !outOfStock) filters.push({ available: true });
  if (outOfStock && !inStock) filters.push({ available: false });

  for (const productType of searchParams.getAll("filter.p.product_type")) {
    filters.push({ productType });
  }

  for (const productVendor of searchParams.getAll("filter.p.vendor")) {
    filters.push({ productVendor });
  }

  for (const tag of searchParams.getAll("filter.p.tag")) {
    filters.push({ tag });
  }

  for (const [key, value] of searchParams) {
    let match: RegExpMatchArray | null;

    if ((match = key.match(/^filter\.v\.option\.(.+)$/))) {
      filters.push({ variantOption: { name: decodeFilterKeyPart(match[1]), value } });
      continue;
    }

    if ((match = key.match(/^filter\.p\.m\.([^.]+)\.(.+)$/))) {
      filters.push({
        productMetafield: {
          namespace: decodeFilterKeyPart(match[1]),
          key: decodeFilterKeyPart(match[2]),
          value,
        },
      });
      continue;
    }

    if ((match = key.match(/^filter\.v\.m\.([^.]+)\.(.+)$/))) {
      filters.push({
        variantMetafield: {
          namespace: decodeFilterKeyPart(match[1]),
          key: decodeFilterKeyPart(match[2]),
          value,
        },
      });
      continue;
    }

    if ((match = key.match(/^filter\.v\.t\.([^.]+)\.(.+)$/))) {
      filters.push({
        taxonomyMetafield: {
          key: `${decodeFilterKeyPart(match[1])}.${decodeFilterKeyPart(match[2])}`,
          value,
        },
      });
    }
  }

  return filters;
}

/** Mirrors `getCollectionSortKey` from storefront-standard-events. */
function parseCollectionSortKey(
  searchParams: URLSearchParams,
): ProductCollectionSortKeys | undefined {
  const rawSortBy = searchParams.get("sort_by");
  return rawSortBy ? STANDARD_EVENTS_COLLECTION_SORT_KEY[rawSortBy] : undefined;
}

function parseLocalizedNumber(value: string): number {
  try {
    const locale = typeof window !== "undefined" ? window.Shopify?.locale : undefined;
    const parts = new Intl.NumberFormat(locale ?? "en").formatToParts(1234.5);
    const group = parts.find((part) => part.type === "group")?.value ?? ",";
    const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
    const normalized = value.split(group).join("").replace(decimal, ".");
    const number = Number(normalized);
    if (!Number.isNaN(number)) return number;
  } catch {}

  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

function decodeFilterKeyPart(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

function getFilterParamEntries(filter: ProductFilter): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  if (filter.available != null) {
    entries.push({ key: "filter.v.availability", value: filter.available ? "1" : "0" });
  }

  if (filter.price) {
    if (filter.price.min != null) {
      entries.push({ key: "filter.v.price.gte", value: String(filter.price.min) });
    }
    if (filter.price.max != null) {
      entries.push({ key: "filter.v.price.lte", value: String(filter.price.max) });
    }
  }

  if (filter.productType != null) {
    entries.push({ key: "filter.p.product_type", value: filter.productType });
  }

  if (filter.productVendor != null) {
    entries.push({ key: "filter.p.vendor", value: filter.productVendor });
  }

  if (filter.tag != null) {
    entries.push({ key: "filter.p.tag", value: filter.tag });
  }

  if (filter.variantOption) {
    entries.push({
      key: `filter.v.option.${encodeURIComponent(filter.variantOption.name)}`,
      value: filter.variantOption.value ?? "",
    });
  }

  if (filter.productMetafield) {
    const { namespace, key, value } = filter.productMetafield;
    entries.push({
      key: `filter.p.m.${encodeURIComponent(namespace)}.${encodeURIComponent(key)}`,
      value: value ?? "",
    });
  }

  if (filter.variantMetafield) {
    const { namespace, key, value } = filter.variantMetafield;
    entries.push({
      key: `filter.v.m.${encodeURIComponent(namespace)}.${encodeURIComponent(key)}`,
      value: value ?? "",
    });
  }

  if (filter.taxonomyMetafield) {
    const fullKey = filter.taxonomyMetafield.key;
    const dotIdx = fullKey.indexOf(".");
    const ns = dotIdx >= 0 ? fullKey.slice(0, dotIdx) : fullKey;
    const k = dotIdx >= 0 ? fullKey.slice(dotIdx + 1) : "";
    entries.push({
      key: `filter.v.t.${encodeURIComponent(ns)}.${encodeURIComponent(k)}`,
      value: filter.taxonomyMetafield.value,
    });
  }

  if (filter.category) {
    entries.push({ key: "filter.p.category", value: filter.category.id });
  }

  return entries;
}

function serializeFilter(params: URLSearchParams, filter: ProductFilter): void {
  for (const { key, value } of getFilterParamEntries(filter)) {
    params.append(key, value);
  }
}

function removeFilterParams(params: URLSearchParams, filter: ProductFilter): void {
  for (const { key, value } of getFilterParamEntries(filter)) {
    removeParamValue(params, key, value);
  }
}

/** Compares two individual {@link ProductFilter} objects for semantic equality. */
export function filterEquals(a: ProductFilter, b: ProductFilter): boolean {
  const kindA = filterKind(a);
  const kindB = filterKind(b);
  if (kindA !== kindB || kindA == null) return false;

  switch (kindA) {
    case "tag":
      return a.tag === b.tag;
    case "available":
      return a.available === b.available;
    case "price":
      return priceRangeEquals(a.price, b.price);
    case "productType":
      return a.productType === b.productType;
    case "productVendor":
      return a.productVendor === b.productVendor;
    case "variantOption": {
      const aOpt = a.variantOption;
      const bOpt = b.variantOption;
      if (aOpt == null || bOpt == null) return false;
      return aOpt.name === bOpt.name && (aOpt.value ?? "") === (bOpt.value ?? "");
    }
    case "productMetafield": {
      const aMeta = a.productMetafield;
      const bMeta = b.productMetafield;
      if (aMeta == null || bMeta == null) return false;
      return metafieldEquals(aMeta, bMeta);
    }
    case "variantMetafield": {
      const aMeta = a.variantMetafield;
      const bMeta = b.variantMetafield;
      if (aMeta == null || bMeta == null) return false;
      return metafieldEquals(aMeta, bMeta);
    }
    case "taxonomyMetafield": {
      const aMeta = a.taxonomyMetafield;
      const bMeta = b.taxonomyMetafield;
      if (aMeta == null || bMeta == null) return false;
      return aMeta.key === bMeta.key && aMeta.value === bMeta.value;
    }
    case "category": {
      const aCat = a.category;
      const bCat = b.category;
      if (aCat == null || bCat == null) return false;
      return aCat.id === bCat.id;
    }
  }
}

/** Returns `true` when `input` (a Storefront API filter JSON string) matches an active filter. */
export function isFilterInputActive(activeFilters: ProductFilter[], input: string): boolean {
  let parsed: ProductFilter;
  try {
    parsed = JSON.parse(input) as ProductFilter;
  } catch {
    return false;
  }
  return activeFilters.some((filter) => filterEquals(filter, parsed));
}

function filterKind(
  filter: ProductFilter,
):
  | "tag"
  | "available"
  | "price"
  | "productType"
  | "productVendor"
  | "variantOption"
  | "productMetafield"
  | "variantMetafield"
  | "taxonomyMetafield"
  | "category"
  | null {
  if (filter.tag != null) return "tag";
  if (filter.available != null) return "available";
  if (filter.price != null) return "price";
  if (filter.productType != null) return "productType";
  if (filter.productVendor != null) return "productVendor";
  if (filter.variantOption != null) return "variantOption";
  if (filter.productMetafield != null) return "productMetafield";
  if (filter.variantMetafield != null) return "variantMetafield";
  if (filter.taxonomyMetafield != null) return "taxonomyMetafield";
  if (filter.category != null) return "category";
  return null;
}

function priceRangeEquals(a: ProductFilter["price"], b: ProductFilter["price"]): boolean {
  if (a == null || b == null) return a === b;
  return a.min === b.min && a.max === b.max;
}

function metafieldEquals(
  a: { namespace: string; key: string; value?: string },
  b: { namespace: string; key: string; value?: string },
): boolean {
  return a.namespace === b.namespace && a.key === b.key && (a.value ?? "") === (b.value ?? "");
}

function filtersEqual(a: ProductFilter[], b: ProductFilter[]): boolean {
  if (a.length !== b.length) return false;

  const remaining = [...b];
  for (const filter of a) {
    const index = remaining.findIndex((candidate) => filterEquals(filter, candidate));
    if (index === -1) return false;
    remaining.splice(index, 1);
  }

  return true;
}

function removeParamValue(params: URLSearchParams, name: string, value: string): void {
  const remaining = params.getAll(name).filter((v) => v !== value);
  params.delete(name);
  for (const v of remaining) {
    params.append(name, v);
  }
}
