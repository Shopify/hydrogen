import {
  isFilterInputActive,
  parseCollectionParams,
  serializeCollectionParams,
  type AvailableFilter,
  type ProductFilter,
} from "@shopify/hydrogen";
import { useCallback, useEffect, useRef, type CSSProperties, type ChangeEvent } from "react";

import { content } from "./content";

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
  filter,
  value,
  activeFilters,
  isLoading,
}: {
  filter: VisualAvailableFilter;
  value: FilterValueWithVisuals;
  activeFilters: ProductFilter[];
  isLoading?: boolean;
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
        checked={isFilterInputActive(activeFilters, value.input)}
        onChange={(event) => {
          const input = event.currentTarget;
          if (input.checked && (filter.type === "BOOLEAN" || name === "filter.v.availability")) {
            for (const sibling of input.form?.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]',
            ) ?? []) {
              if (sibling !== input && sibling.name === name) sibling.checked = false;
            }
          }
          input.form?.requestSubmit();
        }}
        className={isSwatch ? "sr-only" : "size-4"}
        aria-busy={isLoading}
        autoComplete="off"
      />
      {isSwatch ? <FilterValueSwatch value={value} /> : null}
      <span className="text-on-surface">{value.label}</span>
      {value.count > 0 ? (
        <span className="text-on-surface-secondary text-xs">({value.count})</span>
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

  return {
    "--filter-swatch-color": value.swatch?.color ?? "#e5e5e5",
    backgroundImage: image ? `url("${image}")` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
  } as CSSProperties;
}

/** A min/max price range filter (PRICE_RANGE filter type). */
export function PriceRangeFilter({
  filter,
  activeFilters,
  currencyCode,
  isLoading,
}: {
  filter: VisualAvailableFilter;
  activeFilters: ProductFilter[];
  isLoading?: boolean;
  currencyCode?: string;
}) {
  const { min, max } = activePriceRange(activeFilters);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);
  const cancelPriceSubmit = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    const input = minInput.current;
    if (!input) return;
    const matches =
      min === "" ? input.value === "" : input.value !== "" && Number(input.value) === Number(min);
    if (!matches) {
      cancelPriceSubmit();
      input.value = min;
    }
  }, [min, cancelPriceSubmit]);

  useEffect(() => {
    const input = maxInput.current;
    if (!input) return;
    const matches =
      max === "" ? input.value === "" : input.value !== "" && Number(input.value) === Number(max);
    if (!matches) {
      cancelPriceSubmit();
      input.value = max;
    }
  }, [max, cancelPriceSubmit]);

  useEffect(() => {
    const form = minInput.current?.form;
    function restoreHistoryPrice() {
      cancelPriceSubmit();
      const { filters } = parseCollectionParams(new URLSearchParams(window.location.search));
      const price = activePriceRange(filters);
      if (minInput.current) minInput.current.value = price.min;
      if (maxInput.current) maxInput.current.value = price.max;
    }
    function cancelOnNavigation(event: MouseEvent) {
      // Stop the draft before a link navigation waits for its server response.
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        link &&
        (!link.target || link.target === "_self") &&
        !link.hasAttribute("download")
      ) {
        restoreHistoryPrice();
      }
    }
    form?.addEventListener("submit", cancelPriceSubmit, true);
    document.addEventListener("click", cancelOnNavigation, true);
    window.addEventListener("popstate", restoreHistoryPrice);
    return () => {
      cancelPriceSubmit();
      form?.removeEventListener("submit", cancelPriceSubmit, true);
      document.removeEventListener("click", cancelOnNavigation, true);
      window.removeEventListener("popstate", restoreHistoryPrice);
    };
  }, [cancelPriceSubmit]);

  function submitAfterTyping(event: ChangeEvent<HTMLInputElement>) {
    cancelPriceSubmit();
    const form = event.currentTarget.form;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (form?.isConnected) form.requestSubmit();
    }, 350);
  }

  const currency = currencyCode ?? "USD";
  return (
    <fieldset className="flex flex-col gap-2" aria-busy={isLoading}>
      <legend className="type-body-sm text-on-surface mb-1 font-medium">
        {filter.label} ({currency})
      </legend>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1 text-sm">
          <span className="text-on-surface-secondary sr-only">{content.collection.priceMin}</span>
          <input
            type="number"
            ref={minInput}
            name="filter.v.price.gte"
            min={0}
            defaultValue={min}
            placeholder={content.collection.priceMin}
            inputMode="numeric"
            autoComplete="off"
            onChange={submitAfterTyping}
            className="number-reset rounded-button border-border h-9 w-full border px-2 text-sm"
          />
        </label>
        <span className="text-on-surface-secondary text-sm">{content.collection.priceTo}</span>
        <label className="flex flex-1 items-center gap-1 text-sm">
          <span className="text-on-surface-secondary sr-only">{content.collection.priceMax}</span>
          <input
            type="number"
            ref={maxInput}
            name="filter.v.price.lte"
            min={0}
            defaultValue={max}
            placeholder={content.collection.priceMax}
            inputMode="numeric"
            autoComplete="off"
            onChange={submitAfterTyping}
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
  isLoading,
  currencyCode,
}: {
  filter: VisualAvailableFilter;
  activeFilters: ProductFilter[];
  isLoading?: boolean;
  currencyCode?: string;
}) {
  if (filter.type === "PRICE_RANGE") {
    return (
      <PriceRangeFilter
        filter={filter}
        activeFilters={activeFilters}
        isLoading={isLoading}
        currencyCode={currencyCode}
      />
    );
  }
  return (
    <fieldset className="flex flex-col gap-2" aria-busy={isLoading}>
      <legend className="type-body-sm text-on-surface mb-1 font-medium">{filter.label}</legend>
      {filter.values.map((value) => (
        <FilterValueInput
          key={value.id}
          filter={filter}
          value={value}
          activeFilters={activeFilters}
          isLoading={isLoading}
        />
      ))}
    </fieldset>
  );
}
