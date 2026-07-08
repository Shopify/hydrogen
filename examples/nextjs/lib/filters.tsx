import {
  isFilterInputActive,
  serializeCollectionParams,
  type AvailableFilter,
  type ProductFilter,
} from "@shopify/hydrogen";

import { content } from "./content";

/**
 * Shared collection/search filter helpers (`hydrogen-collection-browser`).
 * Extracted so the collection PLP and the search page render filters
 * identically and don't fork the param-serialization + value-input logic.
 */

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
        defaultChecked={isFilterInputActive(activeFilters, value.input)}
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
            type="number"
            name="filter.v.price.gte"
            min={0}
            defaultValue={min}
            placeholder={content.collection.priceMin}
            inputMode="numeric"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="number-reset rounded-button border-border h-9 w-full border px-2 text-sm"
          />
        </label>
        <span className="text-on-surface-secondary text-sm">{content.collection.priceTo}</span>
        <label className="flex flex-1 items-center gap-1 text-sm">
          <span className="text-on-surface-secondary sr-only">{content.collection.priceMax}</span>
          <input
            type="number"
            name="filter.v.price.lte"
            min={0}
            defaultValue={max}
            placeholder={content.collection.priceMax}
            inputMode="numeric"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
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
