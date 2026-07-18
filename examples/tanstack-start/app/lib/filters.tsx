import {
  getFilterRemovalUrl,
  isFilterInputActive,
  serializeCollectionParams,
  type AvailableFilter,
  type ProductFilter,
} from "@shopify/hydrogen";
import { Link } from "@tanstack/react-router";

import { content } from "./content";
import { searchParamsToRecord } from "./search-params";

/**
 * Shared collection/search browse helpers (`hydrogen-collection-browser`).
 * Extracted so the collection PLP and the search page render filters
 * identically and don't fork the param-serialization + value-input logic.
 */

/** Remove all filter values and the stale cursor while preserving other URL state. */
export function clearFilterParams(searchParams: URLSearchParams): URLSearchParams {
  const cleared = new URLSearchParams(searchParams);
  for (const key of Array.from(cleared.keys())) {
    if (key.startsWith("filter.")) cleared.delete(key);
  }
  cleared.delete("after");
  return cleared;
}

/** Serialize a Storefront API filter `input` string into form field entries. */
export function filterValueInputParamEntries(
  input: string,
): Array<{ name: string; value: string }> {
  let parsedFilter: ProductFilter;
  try {
    // F13: skill-sanctioned cast mirroring hydrogen-collection-browser/references/react.md
    // (JSON.parse of the Storefront `FilterValue.input` JSON string).
    parsedFilter = JSON.parse(input) as ProductFilter;
  } catch {
    return [];
  }

  return Array.from(
    serializeCollectionParams({
      filters: [parsedFilter],
      sortKey: undefined,
      reverse: false,
    }),
    ([name, value]) => ({ name, value }),
  );
}

/** Active price filter values (for prefilling min/max), if any. */
export function activePriceRange(activeFilters: ProductFilter[]): { min: string; max: string } {
  const price = activeFilters.find((f) => f.price)?.price;
  return {
    min: price?.min != null ? String(price.min) : "",
    max: price?.max != null ? String(price.max) : "",
  };
}

/** A single checkbox filter value (LIST / BOOLEAN filter types). */
export function FilterValueInput({
  filter: _filter,
  value,
  activeFilters,
}: {
  filter: AvailableFilter;
  value: { id: string; label: string; count: number; input: string };
  activeFilters: ProductFilter[];
}) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;

  return (
    <label className="min-h-touch-target flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value={paramValue}
        checked={isFilterInputActive(activeFilters, value.input)}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="size-4"
      />
      <span className="text-on-surface">{value.label}</span>
      {value.count > 0 ? (
        <span className="text-on-surface-secondary text-xs">({value.count})</span>
      ) : null}
    </label>
  );
}

/** A min/max price range filter (PRICE_RANGE filter type). */
export function PriceRangeFilter({
  filter,
  activeFilters,
}: {
  filter: AvailableFilter;
  activeFilters: ProductFilter[];
}) {
  const { min, max } = activePriceRange(activeFilters);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="type-body-sm text-on-surface mb-1 font-medium">{filter.label}</legend>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1 text-sm">
          <span className="text-on-surface-secondary sr-only">{content.collection.priceMin}</span>
          <input
            key={`min-${min}`}
            type="number"
            name="filter.v.price.gte"
            min={0}
            defaultValue={min}
            placeholder={content.collection.priceMin}
            inputMode="numeric"
            onBlur={(event) => {
              if (event.currentTarget.value !== event.currentTarget.defaultValue) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="number-reset rounded-button border-border h-9 w-full border px-2 text-sm"
          />
        </label>
        <span className="text-on-surface-secondary text-sm">{content.collection.priceTo}</span>
        <label className="flex flex-1 items-center gap-1 text-sm">
          <span className="text-on-surface-secondary sr-only">{content.collection.priceMax}</span>
          <input
            key={`max-${max}`}
            type="number"
            name="filter.v.price.lte"
            min={0}
            defaultValue={max}
            placeholder={content.collection.priceMax}
            inputMode="numeric"
            onBlur={(event) => {
              if (event.currentTarget.value !== event.currentTarget.defaultValue) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
            className="number-reset rounded-button border-border h-9 w-full border px-2 text-sm"
          />
        </label>
      </div>
    </fieldset>
  );
}

/** A filter group: renders a PRICE_RANGE or a list of checkbox values. */
export function FilterGroup({
  filter,
  activeFilters,
}: {
  filter: AvailableFilter;
  activeFilters: ProductFilter[];
}) {
  if (filter.type === "PRICE_RANGE") {
    return <PriceRangeFilter filter={filter} activeFilters={activeFilters} />;
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="type-body-sm text-on-surface mb-1 font-medium">{filter.label}</legend>
      {filter.values.map((value) => (
        <FilterValueInput
          key={value.id}
          filter={filter}
          value={value}
          activeFilters={activeFilters}
        />
      ))}
    </fieldset>
  );
}

/** One set of facet controls: collapsible on mobile and persistently visible on desktop. */
export function FilterPanel({
  availableFilters,
  activeFilters,
}: {
  availableFilters: AvailableFilter[];
  activeFilters: ProductFilter[];
}) {
  if (availableFilters.length === 0) return null;

  return (
    <aside>
      {/* Keep the disclosure open in SSR so desktop controls remain semantic,
          focusable form fields. The mobile summary can still close it. */}
      <details open className="group">
        <summary className="border-border rounded-button flex min-h-11 cursor-pointer list-none items-center justify-between border px-4 text-sm font-medium lg:hidden">
          {content.collection.filters}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="mt-4 hidden flex-col gap-6 group-open:flex lg:mt-0 lg:flex">
          <h2 className="type-heading-sm text-on-surface hidden font-medium lg:block">
            {content.collection.filters}
          </h2>
          {availableFilters.map((filter) => (
            <FilterGroup key={filter.id} filter={filter} activeFilters={activeFilters} />
          ))}
        </div>
      </details>
    </aside>
  );
}

/** Progressive-enhancement links for removing one filter or clearing all filters. */
export function ActiveFilterChips({
  activeFilters,
  pathname,
  searchParams,
  clearSearchParams,
}: {
  activeFilters: ProductFilter[];
  pathname: string;
  searchParams: URLSearchParams;
  clearSearchParams: URLSearchParams;
}) {
  if (activeFilters.length === 0) return null;

  const removalBase = new URLSearchParams(searchParams);
  removalBase.delete("after");

  return (
    <ul role="list" aria-label={content.collection.activeFilters} className="flex flex-wrap gap-2">
      {activeFilters.map((filter, index) => {
        const label = describeFilter(filter);
        const removal = getFilterRemovalUrl(removalBase, filter);
        const removalParams = new URLSearchParams(removal === "?" ? "" : removal);
        return (
          <li key={`${JSON.stringify(filter)}-${index}`}>
            <Link
              to={pathname}
              search={searchParamsToRecord(removalParams)}
              resetScroll={false}
              aria-label={content.collection.removeFilter.replace("{{ filter }}", label)}
              className="chip-filled inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm no-underline"
            >
              {label}
              <span aria-hidden="true">×</span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link
          to={pathname}
          search={searchParamsToRecord(clearSearchParams)}
          resetScroll={false}
          className="text-accent inline-flex items-center rounded-full px-3 py-1 text-sm no-underline underline"
        >
          {content.collection.clearAll}
        </Link>
      </li>
    </ul>
  );
}

export function describeFilter(filter: ProductFilter): string {
  if (filter.available !== undefined) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption) {
    const option = filter.variantOption;
    return option.value ?? option.name ?? "Variant";
  }
  if (filter.price) {
    const price = filter.price;
    const hasMin = price.min != null && Number(price.min) > 0;
    const hasMax = price.max != null;
    if (hasMin && hasMax) return `${price.min} ${content.collection.priceTo} ${price.max}`;
    if (hasMax) return `Up to ${price.max}`;
    if (hasMin) return `From ${price.min}`;
    return "Price";
  }
  return "Filter";
}
