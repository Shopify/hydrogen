import { isFilterInputActive, type AvailableFilter, type ProductFilter } from "@shopify/hydrogen";
import type { CSSProperties } from "react";

import { content } from "./content";
import { filterValueInputParamEntries } from "./filter-input";

type FilterSwatch = {
  color?: string | null;
  image?: { previewImage?: { url?: string | null } | null } | null;
} | null;

type FilterValueWithVisuals = AvailableFilter["values"][number] & {
  swatch?: FilterSwatch;
};

export type VisualAvailableFilter = Omit<AvailableFilter, "values"> & {
  values: FilterValueWithVisuals[];
};

/**
 * Shared collection/search filter helpers (`hydrogen-collection-browser`).
 * Extracted so the collection PLP and the search page render filters
 * identically and don't fork the param-serialization + value-input logic.
 */

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
  filter,
  value,
  activeFilters,
  disabled,
  countPending,
}: {
  filter: VisualAvailableFilter;
  value: FilterValueWithVisuals;
  activeFilters: ProductFilter[];
  disabled?: boolean;
  countPending?: boolean;
}) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;
  const isSwatch = filter.presentation === "SWATCH";

  return (
    <label className="min-h-touch-target flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value={paramValue}
        defaultChecked={isFilterInputActive(activeFilters, value.input)}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={isSwatch ? "sr-only" : "size-4"}
        disabled={disabled}
        autoComplete="off"
      />
      {isSwatch ? <FilterValueSwatch value={value} /> : null}
      <span className="text-on-surface">{value.label}</span>
      {value.count > 0 ? (
        <span
          className={`text-on-surface-secondary text-xs motion-safe:transition-opacity ${countPending ? "opacity-40" : ""}`}
        >
          ({value.count})
        </span>
      ) : null}
    </label>
  );
}

function FilterValueSwatch({ value }: { value: FilterValueWithVisuals }) {
  return (
    <span aria-hidden="true" className="filter-swatch shrink-0" style={getFilterSwatchStyle(value)}>
      <svg className="filter-check-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 8.25 6.5 11 12.5 5" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function getFilterSwatchStyle(value: FilterValueWithVisuals): CSSProperties {
  const image = value.swatch?.image?.previewImage?.url;

  const style: CSSProperties & { "--filter-swatch-color": string } = {
    "--filter-swatch-color": value.swatch?.color ?? "#e5e5e5",
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
  return style;
}

/** A min/max price range filter (PRICE_RANGE filter type). */
export function PriceRangeFilter({
  filter,
  activeFilters,
  disabled,
  currencyCode,
}: {
  filter: VisualAvailableFilter;
  activeFilters: ProductFilter[];
  disabled?: boolean;
  currencyCode: string;
}) {
  const { min, max } = activePriceRange(activeFilters);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="type-body-sm text-on-surface mb-1 font-medium">
        {filter.label} ({currencyCode})
      </legend>
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
            autoComplete="off"
            disabled={disabled}
            onBlur={(event) => event.currentTarget.form?.requestSubmit()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
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
            type="number"
            name="filter.v.price.lte"
            min={0}
            defaultValue={max}
            placeholder={content.collection.priceMax}
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            onBlur={(event) => event.currentTarget.form?.requestSubmit()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
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
  disabled,
  countPending,
  currencyCode,
}: {
  filter: VisualAvailableFilter;
  activeFilters: ProductFilter[];
  disabled?: boolean;
  countPending?: boolean;
  currencyCode: string;
}) {
  if (filter.type === "PRICE_RANGE") {
    return (
      <PriceRangeFilter
        filter={filter}
        activeFilters={activeFilters}
        disabled={disabled}
        currencyCode={currencyCode}
      />
    );
  }
  return (
    <fieldset className="flex flex-col gap-2" aria-disabled={disabled}>
      <legend className="type-body-sm text-on-surface mb-1 font-medium">{filter.label}</legend>
      {filter.values.map((value) => (
        <FilterValueInput
          key={value.id}
          filter={filter}
          value={value}
          activeFilters={activeFilters}
          disabled={disabled}
          countPending={countPending}
        />
      ))}
    </fieldset>
  );
}
