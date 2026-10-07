import type { ProductFilter } from "../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";
import type { CollectionState } from "./state";

/**
 * The filters, sort key, and sort direction in a collection URL.
 */
export interface CollectionParams {
  /**
   * Active product filters from the `filter.*` URL params.
   *
   * The filters use the Storefront Standard Events filter type. When your query variables use generated Storefront API types, cast the filters to the generated filter type where you pass them as variables.
   */
  filters: ProductFilter[];
  /** Storefront API sort key from the `sort_by` param, or `undefined` when the param is missing or unrecognized. */
  sortKey: ProductCollectionSortKeys | undefined;
  /** `true` when the `sort_by` value ends with `-descending`. */
  reverse: boolean;
}

const SORT_BY_DESCENDING_SUFFIX = "-descending";
const SORT_BY_ASCENDING_SUFFIX = "-ascending";
const PAGINATION_CURSOR_PARAMS: readonly string[] = ["before", "after"];

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
 * Reads collection filters and sort from URL search params. Pass the result to your Storefront API collection query.
 *
 * The function reads Liquid-compatible `filter.p.*` and `filter.v.*` keys and the `sort_by` param.
 *
 * A URL that sets availability to both in stock and out of stock produces no availability filter. The function recognizes the best-selling and manual sort values, plus created, price, and title with an ascending or descending suffix. Other sort values return an undefined sort key. The parseSortByValue function also recognizes relevance, collection default, and ID.
 *
 * @param searchParams - URL search params to read.
 * @returns The filters, sort key, and sort direction from the URL.
 * @publicDocs
 */
export function parseCollectionParams(searchParams: URLSearchParams): CollectionParams {
  const filters = parseProductFilters(searchParams);
  const sortKey = parseCollectionSortKey(searchParams);
  const rawSortBy = searchParams.get("sort_by");
  const reverse = rawSortBy?.endsWith(SORT_BY_DESCENDING_SUFFIX) ?? false;

  return { filters, sortKey, reverse };
}

/**
 * Converts collection filters and sort to URL search params with Liquid-compatible keys. Use the result to build collection URLs.
 *
 * The result holds only the `filter.*` and `sort_by` keys. The function leaves out `sort_by` for the collection's default sort.
 *
 * Category filters convert to `filter.p.category`, which parseCollectionParams doesn't read. A price filter with a minimum and a maximum produces two params. To build a filter checkbox, parse a filter value's `input` string and convert the parsed filter. The resulting entries give the checkbox name and value.
 *
 * @param state - The filters, sort key, and sort direction to convert.
 * @returns URL search params that hold the filters and sort.
 * @publicDocs
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
function isStoreOwnedParam(key: string): boolean {
  return key === "sort_by" || key.startsWith("filter.");
}

/**
 * Removes a leading `?` from a search string. Normalize search strings before you compare them.
 *
 * @param search The search string from your router, with or without a leading `?`.
 * @returns The search string without a leading `?`.
 * @publicDocs
 */
export function normalizeCollectionSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

/**
 * Merges store-owned params from `state` into `existing`, preserving
 * unrelated keys (e.g. `grid`, `view`) already present in the URL. Collection
 * pagination cursors (`before`, `after`) are cleared so changed browse intent
 * starts from the first page.
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

  clearPaginationCursors(merged);

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
 * Builds a query string from the current URL params, minus the given filter. Use the string in plain remove-filter links.
 *
 * The function keeps every other param and drops the `before` and `after` pagination cursors, which sends the customer to the first page of results.
 *
 * @param currentParams The current URL search params.
 * @param filter The filter to remove from the URL.
 * @returns A query string that starts with `?`. The string is `"?"` alone when no params remain.
 * @publicDocs
 */
export function getFilterRemovalUrl(currentParams: URLSearchParams, filter: ProductFilter): string {
  const result = new URLSearchParams(currentParams);
  removeFilterParams(result, filter);
  clearPaginationCursors(result);
  const serialized = result.toString();
  return serialized ? `?${serialized}` : "?";
}

/** Returns `true` when the sort key supports ascending/descending direction suffixes. */
export function isDirectionalSortKey(sortKey: ProductCollectionSortKeys): boolean {
  return sortKey === "PRICE" || sortKey === "TITLE" || sortKey === "CREATED" || sortKey === "ID";
}

/**
 * Converts a Storefront API sort key and direction to a Liquid-compatible
 * `sort_by` value, such as `"price-ascending"` or `"best-selling"`.
 *
 * Only the price, title, created, and ID sort keys get a direction suffix.
 * Other sort keys, such as best selling, ignore the direction.
 *
 * @param sortKey - Storefront API product collection sort key.
 * @param reverse - `true` for descending, `false` for ascending.
 * @returns The value for the `sort_by` URL param.
 * @publicDocs
 */
export function getSortByValue(sortKey: ProductCollectionSortKeys, reverse: boolean): string {
  const base = SORT_KEY_TO_SORT_BY[sortKey] ?? sortKey.toLowerCase();

  if (!isDirectionalSortKey(sortKey)) return base;

  return reverse ? `${base}-descending` : `${base}-ascending`;
}

/**
 * Converts a Liquid-compatible `sort_by` value to a Storefront API
 * sort key and direction. The getSortByValue function does the opposite conversion.
 *
 * Unrecognized values return an undefined sort key.
 *
 * @param value - A `sort_by` value, such as `"price-ascending"` or `"best-selling"`.
 * @returns The sort key and `reverse`, which reads `true` for descending values.
 * @publicDocs
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

function clearPaginationCursors(params: URLSearchParams): void {
  for (const key of PAGINATION_CURSOR_PARAMS) {
    params.delete(key);
  }
}

/**
 * Checks whether two product filters match.
 *
 * Price filters match when the minimum and maximum are equal, including ranges that set only one bound.
 *
 * @param a The first filter to compare.
 * @param b The second filter to compare.
 * @returns `true` when both filters are the same kind with the same values. `false` for different kinds or unrecognized filters.
 * @publicDocs
 */
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

/**
 * Checks whether a filter value's `input` JSON string from the Storefront API matches an active filter. Use the result to set the checked state of a filter control.
 *
 * The function compares filters the same way as filterEquals.
 *
 * @param activeFilters The active filters, such as `filters` from the collection state.
 * @param input The filter value's `input` JSON string.
 * @returns `true` when the parsed input matches an active filter. `false` when the input matches no active filter or isn't valid JSON.
 * @publicDocs
 */
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
