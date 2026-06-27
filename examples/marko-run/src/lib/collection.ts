import type { AvailableFilter, ProductFilter } from "@shopify/hydrogen";
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
} from "@shopify/hydrogen";

export const SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

export function filterInputToParamEntries(input: string): Array<{ name: string; value: string }> {
  let filter: ProductFilter;
  try {
    filter = JSON.parse(input) as ProductFilter;
  } catch {
    return [];
  }

  return Array.from(
    serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }),
    ([name, value]) => ({ name, value }),
  );
}

export function describeFilter(filter: ProductFilter): string {
  if (filter.tag) return filter.tag;
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.variantOption) return `${filter.variantOption.name}: ${filter.variantOption.value}`;
  if (filter.price) {
    const { min, max } = filter.price;
    if (min != null && max == null) return `$${min}+`;
    if (max != null && min == null) return `Up to $${max}`;
    if (min != null && max != null) return `$${min} - $${max}`;
  }
  return "Filter";
}

export function filterRemovalHref(
  collectionPath: string,
  currentParams: URLSearchParams,
  filter: ProductFilter,
): string {
  const removal = getFilterRemovalUrl(currentParams, filter);
  return removal === "?" ? collectionPath : `${collectionPath}${removal}`;
}

export function visibleValues(filter: AvailableFilter) {
  return filter.values.filter((value) => value.count > 0);
}

export function isFilterActive(filters: ProductFilter[], input: string): boolean {
  return isFilterInputActive(filters, input);
}
