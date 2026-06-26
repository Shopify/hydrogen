import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
  type CollectionState,
  type MoneyV2,
  type ProductFilter,
} from "@shopify/hydrogen";
import { useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useFetcher, useLocation } from "react-router";

import { formatPrice } from "~/lib/money";

export type SortOption = {
  label: string;
  value: string;
};

export const COLLECTION_SORT_OPTIONS: SortOption[] = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A–Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z–A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

export const SEARCH_SORT_OPTIONS: SortOption[] = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

export type BrowseFilterValue = {
  id: string;
  label: string;
  count: number;
  input?: string | null;
  swatch?: {
    color?: string | null;
    image?: {
      previewImage?: {
        url?: string | null;
        altText?: string | null;
      } | null;
    } | null;
  } | null;
};

export type BrowseFilter = {
  id: string;
  label: string;
  type?: string | null;
  presentation?: string | null;
  values: readonly BrowseFilterValue[];
};

export type BrowsePageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};

type LoadMoreResponse<T> = {
  products: readonly T[];
  pageInfo: BrowsePageInfo;
  dataSearch: string;
};

const FILTER_DRAWER_ID = "collection-filter-drawer";
const PRICE_MIN_PARAM = "filter.v.price.gte";
const PRICE_MAX_PARAM = "filter.v.price.lte";

function supportsDialogCommands(): boolean {
  if (typeof HTMLButtonElement === "undefined") return false;
  return (
    "command" in HTMLButtonElement.prototype && "commandForElement" in HTMLButtonElement.prototype
  );
}

function openDialogFallback(id: string): void {
  if (supportsDialogCommands() || typeof document === "undefined") return;
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
}

function closeDialog(id: string): void {
  if (typeof document === "undefined") return;
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement) dialog.close();
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function currentSortValue(state: CollectionState): string | undefined {
  return state.sortKey ? getSortByValue(state.sortKey, state.reverse) : undefined;
}

function filterValueInputParamEntries(input: string): Array<{ name: string; value: string }> {
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

function hiddenInputsFromParams(params: URLSearchParams, exclude = new Set<string>()) {
  return Array.from(params).flatMap(([name, value], index) => {
    if (exclude.has(name)) return [];
    return <input key={`${name}-${value}-${index}`} type="hidden" name={name} value={value} />;
  });
}

function activeFilterParams(state: CollectionState) {
  return serializeCollectionParams({ filters: state.filters, sortKey: undefined, reverse: false });
}

function buildPathWithRemoval(basePath: string, removal: string): string {
  if (removal === "?") return basePath;

  const [pathname, existingSearch = ""] = basePath.split("?");
  const params = new URLSearchParams(existingSearch);
  const removalParams = new URLSearchParams(removal.startsWith("?") ? removal.slice(1) : removal);

  for (const [name, value] of removalParams) params.append(name, value);

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function priceFilter(state: CollectionState) {
  return state.filters.find((filter) => filter.price != null)?.price;
}

function money(amount: number, currencyCode: string): MoneyV2 {
  return { amount: String(amount), currencyCode };
}

function describeFilter(filter: ProductFilter, currencyCode: string): string {
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption) return filter.variantOption.value ?? filter.variantOption.name;
  if (filter.productMetafield) return filter.productMetafield.value ?? filter.productMetafield.key;
  if (filter.variantMetafield) return filter.variantMetafield.value ?? filter.variantMetafield.key;
  if (filter.taxonomyMetafield) return filter.taxonomyMetafield.value;
  if (filter.category) return filter.category.id;
  if (filter.price) {
    const min = filter.price.min;
    const max = filter.price.max;
    if (min != null && max != null) {
      return `${formatPrice(money(min, currencyCode))} – ${formatPrice(money(max, currencyCode))}`;
    }
    if (min != null) return `From ${formatPrice(money(min, currencyCode))}`;
    if (max != null) return `Up to ${formatPrice(money(max, currencyCode))}`;
  }
  return "Filter";
}

function activeValueCount(filter: BrowseFilter, state: CollectionState): number {
  if (filter.type === "PRICE_RANGE") return priceFilter(state) ? 1 : 0;
  return filter.values.filter(
    (value) => value.input && isFilterInputActive(state.filters, value.input),
  ).length;
}

function isSwatchFilter(filter: BrowseFilter): boolean {
  return (
    filter.presentation === "SWATCH" ||
    filter.values.some((value) => value.swatch?.color || value.swatch?.image?.previewImage?.url)
  );
}

function isMutuallyExclusive(filter: BrowseFilter, inputName: string): boolean {
  return filter.type === "BOOLEAN" || inputName === "filter.v.availability";
}

function uncheckSiblings(input: HTMLInputElement) {
  const form = input.form;
  if (!form) return;
  for (const candidate of form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    if (candidate !== input && candidate.name === input.name) candidate.checked = false;
  }
}

function CheckIcon() {
  return (
    <svg
      className="filter-check-icon"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FacetGroup({
  filter,
  children,
  state,
}: {
  filter: BrowseFilter;
  children: ReactNode;
  state: CollectionState;
}) {
  const selectedCount = activeValueCount(filter, state);

  return (
    <details className="block" open>
      <summary className="marker-hidden text-on-surface flex w-full cursor-pointer items-center justify-between py-4 text-sm font-medium motion-safe:transition motion-safe:active:scale-[0.97]">
        <span className="inline-flex items-center gap-1.5">
          {filter.label}
          {selectedCount > 0 ? (
            <>
              <span
                className="bg-interactive text-interactive-text inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
                aria-hidden="true"
              >
                {selectedCount}
              </span>
              <span className="sr-only">
                {selectedCount} {selectedCount === 1 ? "selected" : "selected"}
              </span>
            </>
          ) : null}
        </span>
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <img src="/icons/icon-chevron-down.svg" alt="" className="size-4 rotate-180" />
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function ListFacet({ filter, state }: { filter: BrowseFilter; state: CollectionState }) {
  const values = filter.values.flatMap((value) => {
    if (!value.input) return [];
    const entries = filterValueInputParamEntries(value.input);
    if (entries.length !== 1) return [];
    const [{ name, value: paramValue }] = entries;
    const isActive = isFilterInputActive(state.filters, value.input);

    return (
      <li key={value.id}>
        <label
          data-testid="facet-option"
          className="min-h-touch-target text-on-surface flex cursor-pointer items-center gap-2 py-1 text-sm motion-safe:transition-transform motion-safe:active:scale-[0.97]"
        >
          <input
            type="checkbox"
            name={name}
            value={paramValue}
            defaultChecked={isActive}
            className="sr-only"
            onChange={(event) => {
              if (event.currentTarget.checked && isMutuallyExclusive(filter, name)) {
                uncheckSiblings(event.currentTarget);
              }
              requestFormSubmit(event);
            }}
          />
          <span className="filter-checkbox shrink-0">
            <CheckIcon />
          </span>
          <span className="flex-1">{value.label}</span>
          <span className="text-on-surface-secondary text-xs">({value.count})</span>
        </label>
      </li>
    );
  });

  if (values.length === 0) return null;

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">{filter.label}</legend>
      <ul className="space-y-1 pt-2">{values}</ul>
    </fieldset>
  );
}

function PriceRangeFacet({ state }: { state: CollectionState }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idPrefix = useId();
  const minId = `${idPrefix}-price-gte`;
  const maxId = `${idPrefix}-price-lte`;
  const activePrice = priceFilter(state);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1">
        <label htmlFor={minId} className="sr-only">
          Lowest price
        </label>
        <input
          type="number"
          id={minId}
          name={PRICE_MIN_PARAM}
          min="0"
          placeholder="Min"
          defaultValue={activePrice?.min ?? ""}
          className="border-border rounded-input bg-surface text-on-surface w-full border px-3 py-2 text-sm"
          onChange={(event) => {
            if (timer.current) clearTimeout(timer.current);
            const form = event.currentTarget.form;
            timer.current = setTimeout(() => form?.requestSubmit(), 350);
          }}
        />
      </div>
      <span className="text-on-surface-secondary text-sm">to</span>
      <div className="flex-1">
        <label htmlFor={maxId} className="sr-only">
          Highest price
        </label>
        <input
          type="number"
          id={maxId}
          name={PRICE_MAX_PARAM}
          min="0"
          placeholder="Max"
          defaultValue={activePrice?.max ?? ""}
          className="border-border rounded-input bg-surface text-on-surface w-full border px-3 py-2 text-sm"
          onChange={(event) => {
            if (timer.current) clearTimeout(timer.current);
            const form = event.currentTarget.form;
            timer.current = setTimeout(() => form?.requestSubmit(), 350);
          }}
        />
      </div>
    </div>
  );
}

function ColorSwatchFacet({ filter, state }: { filter: BrowseFilter; state: CollectionState }) {
  const values = filter.values.flatMap((value) => {
    if (!value.input) return [];
    const entries = filterValueInputParamEntries(value.input);
    if (entries.length !== 1) return [];
    const [{ name, value: paramValue }] = entries;
    const swatch = value.swatch;
    const imageUrl = swatch?.image?.previewImage?.url;
    const color = swatch?.color;
    const style = {
      ...(color ? { "--filter-swatch-color": color } : {}),
      ...(imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}),
    } as CSSProperties;

    return (
      <li key={value.id}>
        <label
          data-testid="facet-option"
          className="min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93]"
          title={`${value.label} (${value.count})`}
        >
          <input
            type="checkbox"
            name={name}
            value={paramValue}
            defaultChecked={isFilterInputActive(state.filters, value.input)}
            className="sr-only"
            onChange={requestFormSubmit}
          />
          <span className="filter-swatch shrink-0" style={style}>
            <CheckIcon />
          </span>
          <span className="sr-only">
            {value.label} ({value.count})
          </span>
        </label>
      </li>
    );
  });

  if (values.length === 0) return null;

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">{filter.label}</legend>
      <ul className="flex flex-wrap gap-2.5 pt-2">{values}</ul>
    </fieldset>
  );
}

function FacetBody({ filter, state }: { filter: BrowseFilter; state: CollectionState }) {
  if (filter.type === "PRICE_RANGE") return <PriceRangeFacet state={state} />;
  if (isSwatchFilter(filter)) return <ColorSwatchFacet filter={filter} state={state} />;
  return <ListFacet filter={filter} state={state} />;
}

export function Toolbar({
  countText,
  defaultSortValue,
  sortOptions,
  extraHiddenInputs,
  filterDrawerId = FILTER_DRAWER_ID,
}: {
  countText: string;
  defaultSortValue: string;
  sortOptions: SortOption[];
  extraHiddenInputs?: ReactNode;
  filterDrawerId?: string;
}) {
  const state: CollectionState = useCollection();
  const { formProps } = useCollectionForm();
  const resolvedSortValue = currentSortValue(state) ?? defaultSortValue;
  const hiddenParams = activeFilterParams(state);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <button
          type="button"
          commandfor={filterDrawerId}
          command="show-modal"
          className="button-outline rounded-button focus-visible:outline-accent min-h-touch-target inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] lg:hidden"
          aria-controls={filterDrawerId}
          aria-haspopup="dialog"
          onClick={() => openDialogFallback(filterDrawerId)}
        >
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <img src="/icons/icon-filter.svg" alt="" className="size-5" />
          </span>
          Filters
        </button>
        <span className="text-on-surface-secondary min-w-0 text-sm break-words" aria-live="polite">
          {countText}
        </span>
      </div>
      <form {...formProps()} method="get" className="flex min-w-0 items-center gap-2">
        {hiddenInputsFromParams(hiddenParams)}
        {extraHiddenInputs}
        <label
          htmlFor="sort-by"
          className="text-on-surface-secondary shrink-0 text-sm whitespace-nowrap"
        >
          Sort by
        </label>
        <select
          key={resolvedSortValue}
          id="sort-by"
          name="sort_by"
          defaultValue={resolvedSortValue}
          className="w-auto max-w-full cursor-pointer font-medium"
          onChange={requestFormSubmit}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}

export function FacetForm({
  availableFilters,
  extraHiddenInputs,
  remountKey,
}: {
  availableFilters: readonly BrowseFilter[];
  extraHiddenInputs?: ReactNode;
  remountKey?: string;
}) {
  const state: CollectionState = useCollection();
  const { formProps } = useCollectionForm();
  const serialized = serializeCollectionParams(state);
  const sort = currentSortValue(state);
  const isLoading = state.status === "loading";

  return (
    <form {...formProps()} method="get">
      {sort ? <input type="hidden" name="sort_by" value={sort} /> : null}
      {extraHiddenInputs}
      <fieldset disabled={isLoading} className="m-0 border-0 p-0">
        <div
          key={`${serialized.toString()}:${remountKey ?? ""}`}
          className="divide-border divide-y"
        >
          {availableFilters.map((filter) => (
            <FacetGroup key={filter.id} filter={filter} state={state}>
              <FacetBody filter={filter} state={state} />
            </FacetGroup>
          ))}
        </div>
      </fieldset>
      <noscript>
        <button
          type="submit"
          className="rounded-button button-primary focus-visible:outline-accent mt-4 inline-flex h-11 items-center justify-center px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Apply filters
        </button>
      </noscript>
    </form>
  );
}

export function FilterDrawer({
  availableFilters,
  extraHiddenInputs,
  id = FILTER_DRAWER_ID,
  remountKey,
}: {
  availableFilters: readonly BrowseFilter[];
  extraHiddenInputs?: ReactNode;
  id?: string;
  remountKey?: string;
}) {
  return (
    <dialog
      id={id}
      className="drawer-left bg-surface text-on-surface"
      aria-labelledby="filter-drawer-title"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center py-2 ps-4">
          <h2 id="filter-drawer-title" className="text-on-surface flex-1 text-lg font-medium">
            Filters
          </h2>
          <button
            type="button"
            commandfor={id}
            command="close"
            className="button-icon focus-visible:outline-accent inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label="Close"
            onClick={() => closeDialog(id)}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <FacetForm
            availableFilters={availableFilters}
            extraHiddenInputs={extraHiddenInputs}
            remountKey={remountKey}
          />
        </div>
      </div>
    </dialog>
  );
}

export function ActiveFilterChips({
  basePath,
  clearAllTo,
  currencyCode,
}: {
  basePath: string;
  clearAllTo: string;
  currencyCode: string;
}) {
  const state: CollectionState = useCollection();
  if (state.filters.length === 0) return null;

  const currentParams = serializeCollectionParams(state);

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2"
      role="region"
      aria-label="Active filters"
    >
      {state.filters.map((filter, index) => {
        const label = describeFilter(filter, currencyCode);
        const removal = getFilterRemovalUrl(currentParams, filter);
        const to = buildPathWithRemoval(basePath, removal);

        return (
          <Link
            key={`${label}-${index}-${removal}`}
            to={to}
            preventScrollReset
            className="chip-filled hover:bg-border min-h-touch-target inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label={`Remove ${label} filter`}
          >
            {label}
            <span
              className="inline-flex size-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <img src="/icons/icon-x.svg" alt="" className="size-4" />
            </span>
          </Link>
        );
      })}
      <Link to={clearAllTo} preventScrollReset className="text-accent text-sm hover:underline">
        Clear all
      </Link>
    </div>
  );
}

export function useLoadMore<T>(
  initialNodes: readonly T[],
  initialPageInfo: BrowsePageInfo,
  dataSearch: string,
) {
  const fetcher = useFetcher();
  const [nodes, setNodes] = useState<readonly T[]>(initialNodes);
  const [pageInfo, setPageInfo] = useState<BrowsePageInfo>(initialPageInfo);
  const requestedSearch = useRef<string | null>(null);
  const appendedSearches = useRef(new Set<string>());

  useEffect(() => {
    setNodes(initialNodes);
    setPageInfo(initialPageInfo);
    requestedSearch.current = null;
    appendedSearches.current.clear();
  }, [dataSearch, initialNodes, initialPageInfo]);

  useEffect(() => {
    const data = fetcher.data as LoadMoreResponse<T> | undefined;
    if (!data || data.dataSearch !== requestedSearch.current) return;
    if (appendedSearches.current.has(data.dataSearch)) return;

    appendedSearches.current.add(data.dataSearch);
    requestedSearch.current = null;
    setNodes((current) => [...current, ...data.products]);
    setPageInfo(data.pageInfo);
  }, [fetcher.data]);

  return {
    nodes,
    pageInfo,
    isLoading: fetcher.state !== "idle",
    loadMore: (href: string, nextDataSearch: string) => {
      requestedSearch.current = nextDataSearch;
      fetcher.load(href);
    },
  };
}

export function LoadMore({
  pageInfo,
  loadedCount,
  countLabel,
  isLoading,
  onLoad,
}: {
  pageInfo: BrowsePageInfo;
  loadedCount: number;
  countLabel?: string;
  isLoading: boolean;
  onLoad: (href: string, nextDataSearch: string) => void;
}) {
  const location = useLocation();

  if (!pageInfo.hasNextPage || !pageInfo.endCursor) return null;

  const params = new URLSearchParams(location.search);
  params.set("after", pageInfo.endCursor);
  const nextSearch = params.toString();
  const href = `${location.pathname}?${nextSearch}`;

  return (
    <div className="mt-12 flex flex-col items-center gap-3">
      <p className="text-on-surface-secondary text-sm">
        {countLabel ?? `Showing ${loadedCount} products`}
      </p>
      <Link
        to={href}
        preventScrollReset
        aria-disabled={isLoading}
        className={`button-outline rounded-button focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-6 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${isLoading ? "pointer-events-none opacity-50" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          if (!isLoading) onLoad(href, nextSearch);
        }}
      >
        {isLoading ? "Loading…" : "Load more"}
      </Link>
    </div>
  );
}
