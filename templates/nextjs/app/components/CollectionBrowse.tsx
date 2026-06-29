"use client";

import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  serializeCollectionParams,
  type CollectionState,
  type ProductFilter,
} from "@shopify/hydrogen";
import { useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

import type { CollectionPageData } from "../lib/collection";
import { formatPrice } from "../lib/money";

export const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A–Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z–A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

export const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];

type SortOption = { label: string; value: string };
type AvailableFilter = CollectionPageData["availableFilters"][number];
type AvailableFilterValue = AvailableFilter["values"][number];
type PageInfo = CollectionPageData["pageInfo"];

type HiddenInput = { name: string; value: string };

function requestFormSubmit(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

function currentSortValue(
  state: CollectionState,
  defaultSortValue: string,
  sortOptions: readonly SortOption[],
) {
  const value = state.sortKey ? getSortByValue(state.sortKey, state.reverse) : defaultSortValue;
  return sortOptions.some((option) => option.value === value) ? value : defaultSortValue;
}

function hiddenEntriesFromParams(params: URLSearchParams): HiddenInput[] {
  return Array.from(params, ([name, value]) => ({ name, value }));
}

function HiddenInputs({ inputs }: { inputs: HiddenInput[] }) {
  return inputs.map((input, index) => (
    <input key={`${input.name}:${input.value}:${index}`} type="hidden" {...input} />
  ));
}

function openDialog(id: string) {
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
}

function closeDialog(id: string) {
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
}

export function Toolbar({
  countText,
  defaultSortValue,
  filterDrawerId,
  extraHiddenInputs,
  sortOptions = COLLECTION_SORT_OPTIONS,
}: {
  countText: string;
  defaultSortValue: string;
  filterDrawerId: string;
  extraHiddenInputs?: ReactNode;
  sortOptions?: readonly SortOption[];
}) {
  const state: CollectionState = useCollection();
  const { formProps } = useCollectionForm();
  const filterInputs = useMemo(
    () =>
      hiddenEntriesFromParams(
        serializeCollectionParams({ filters: state.filters, sortKey: undefined, reverse: false }),
      ),
    [state.filters],
  );

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <button
          type="button"
          commandfor={filterDrawerId}
          command="show-modal"
          className="button-outline rounded-button focus-visible:outline-accent min-h-touch-target inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] lg:hidden"
          onClick={() => openDialog(filterDrawerId)}
        >
          <img src="/icons/icon-filter.svg" alt="" className="size-5" aria-hidden="true" />
          Filters
        </button>
        <span className="text-on-surface-secondary min-w-0 text-sm" aria-live="polite">
          {countText}
        </span>
      </div>
      <form {...formProps()} method="get" className="flex min-w-0 items-center gap-2">
        <HiddenInputs inputs={filterInputs} />
        {extraHiddenInputs}
        <label htmlFor="sort-by" className="text-on-surface-secondary text-sm whitespace-nowrap">
          Sort by
        </label>
        <select
          id="sort-by"
          name="sort_by"
          className="w-auto cursor-pointer font-medium"
          defaultValue={currentSortValue(state, defaultSortValue, sortOptions)}
          onChange={requestFormSubmit}
          disabled={state.status === "loading"}
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

function parseFilterInput(input: unknown): ProductFilter | null {
  if (typeof input !== "string") return null;
  try {
    return JSON.parse(input) as ProductFilter;
  } catch {
    return null;
  }
}

function filterInputString(input: unknown) {
  return typeof input === "string" ? input : "";
}

function filterValueInputParamEntries(input: unknown): HiddenInput[] {
  const filter = parseFilterInput(input);
  if (!filter) return [];

  return hiddenEntriesFromParams(
    serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }),
  );
}

function uncheckSiblings(input: HTMLInputElement) {
  const form = input.form;
  if (!form) return;

  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement &&
      element !== input &&
      element.type === "checkbox" &&
      element.name === input.name
    ) {
      element.checked = false;
    }
  }
}

function isMutuallyExclusive(filter: AvailableFilter, inputName: string) {
  return filter.type === "BOOLEAN" || inputName === "filter.v.availability";
}

function CheckIcon() {
  return (
    <svg
      className="filter-check-icon"
      width="14"
      height="14"
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

function selectedCount(filter: AvailableFilter, state: CollectionState) {
  if (filter.type === "PRICE_RANGE") {
    return state.filters.some((item) => item.price?.min != null || item.price?.max != null) ? 1 : 0;
  }

  return filter.values.filter((value) =>
    isFilterInputActive(state.filters, filterInputString(value.input)),
  ).length;
}

function FacetShell({
  filter,
  count,
  children,
  idPrefix,
}: {
  filter: AvailableFilter;
  count: number;
  children: ReactNode;
  idPrefix: string;
}) {
  const bodyId = `${idPrefix}-filter-body-${filter.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <details className="group block" open>
      <summary
        className="marker-hidden text-on-surface min-h-touch-target flex cursor-pointer items-center justify-between py-4 text-sm font-medium motion-safe:transition motion-safe:active:scale-[0.97]"
        aria-controls={bodyId}
      >
        <span className="inline-flex items-center gap-1.5">
          {filter.label}
          {count > 0 ? (
            <>
              <span
                className="bg-interactive text-interactive-text inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
                aria-hidden="true"
              >
                {count}
              </span>
              <span className="sr-only">{count} selected</span>
            </>
          ) : null}
        </span>
        <span
          className="inline-flex size-4 shrink-0 items-center justify-center group-open:rotate-180 motion-safe:transition-transform"
          aria-hidden="true"
        >
          <img src="/icons/icon-chevron-down.svg" alt="" className="size-4" />
        </span>
      </summary>
      <div id={bodyId} className="pb-4">
        {children}
      </div>
    </details>
  );
}

function ListFacet({ filter, state }: { filter: AvailableFilter; state: CollectionState }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">{filter.label}</legend>
      <ul className="space-y-1 pt-2">
        {filter.values.map((value) => {
          const entries = filterValueInputParamEntries(value.input);
          if (entries.length !== 1) return null;
          const [entry] = entries;
          const input = filterInputString(value.input);

          return (
            <li key={value.id}>
              <label
                data-testid="facet-option"
                className="text-on-surface min-h-touch-target flex cursor-pointer items-center gap-2 py-1 text-sm motion-safe:transition-transform motion-safe:active:scale-[0.97]"
              >
                <input
                  type="checkbox"
                  name={entry.name}
                  value={entry.value}
                  className="sr-only"
                  defaultChecked={isFilterInputActive(state.filters, input)}
                  onChange={(event) => {
                    if (event.currentTarget.checked && isMutuallyExclusive(filter, entry.name)) {
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
        })}
      </ul>
    </fieldset>
  );
}

function swatchImage(value: AvailableFilterValue) {
  return (
    value.swatch?.image?.previewImage ??
    value.swatch?.image?.image ??
    value.image?.previewImage ??
    value.image?.image ??
    null
  );
}

function ColorSwatchFacet({ filter, state }: { filter: AvailableFilter; state: CollectionState }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">{filter.label}</legend>
      <ul className="flex flex-wrap gap-2.5 pt-2">
        {filter.values.map((value) => {
          const entries = filterValueInputParamEntries(value.input);
          if (entries.length !== 1) return null;
          const [entry] = entries;
          const input = filterInputString(value.input);
          const image = swatchImage(value);
          const style = {
            "--filter-swatch-color": value.swatch?.color ?? undefined,
            backgroundImage: image?.url ? `url(${image.url})` : undefined,
            backgroundSize: image?.url ? "cover" : undefined,
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
                  name={entry.name}
                  value={entry.value}
                  className="sr-only"
                  defaultChecked={isFilterInputActive(state.filters, input)}
                  onChange={(event) => {
                    if (event.currentTarget.checked && isMutuallyExclusive(filter, entry.name)) {
                      uncheckSiblings(event.currentTarget);
                    }
                    requestFormSubmit(event);
                  }}
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
        })}
      </ul>
    </fieldset>
  );
}

function PriceRangeFacet({ state, idPrefix }: { state: CollectionState; idPrefix: string }) {
  const timerRef = useRef<number | null>(null);
  const price = state.filters.find((filter) => filter.price)?.price;
  const minId = `${idPrefix}-price-gte`;
  const maxId = `${idPrefix}-price-lte`;

  function submitWithDebounce(event: ChangeEvent<HTMLInputElement>) {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    const form = event.currentTarget.form;
    timerRef.current = window.setTimeout(() => form?.requestSubmit(), 350);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
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
          name="filter.v.price.gte"
          min="0"
          inputMode="decimal"
          placeholder="Min"
          defaultValue={price?.min ?? ""}
          className="number-reset"
          onChange={submitWithDebounce}
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
          name="filter.v.price.lte"
          min="0"
          inputMode="decimal"
          placeholder="Max"
          defaultValue={price?.max ?? ""}
          className="number-reset"
          onChange={submitWithDebounce}
        />
      </div>
    </div>
  );
}

function Facet({
  filter,
  state,
  idPrefix,
}: {
  filter: AvailableFilter;
  state: CollectionState;
  idPrefix: string;
}) {
  const count = selectedCount(filter, state);
  const isSwatch = filter.presentation === "SWATCH";

  return (
    <FacetShell filter={filter} count={count} idPrefix={idPrefix}>
      {filter.type === "PRICE_RANGE" ? (
        <PriceRangeFacet state={state} idPrefix={idPrefix} />
      ) : isSwatch ? (
        <ColorSwatchFacet filter={filter} state={state} />
      ) : (
        <ListFacet filter={filter} state={state} />
      )}
    </FacetShell>
  );
}

export function FacetForm({
  availableFilters,
  extraHiddenInputs,
  submitLabel,
  onAfterSubmit,
  idPrefix,
  resetKeySuffix = "",
  sortOptions = COLLECTION_SORT_OPTIONS,
  defaultSortValue = "",
}: {
  availableFilters: CollectionPageData["availableFilters"];
  extraHiddenInputs?: ReactNode;
  submitLabel?: string;
  onAfterSubmit?: () => void;
  idPrefix: string;
  resetKeySuffix?: string;
  sortOptions?: readonly SortOption[];
  defaultSortValue?: string;
}) {
  const state: CollectionState = useCollection();
  const { formProps } = useCollectionForm();
  const resetKey = `${resetKeySuffix}:${serializeCollectionParams(state).toString()}`;
  const sortValue = currentSortValue(state, defaultSortValue, sortOptions);
  const shouldRenderSortInput = state.sortKey && sortValue !== defaultSortValue;

  return (
    <form
      {...formProps({ afterSubmit: onAfterSubmit })}
      method="get"
      className="flex min-h-0 flex-1 flex-col"
    >
      {shouldRenderSortInput ? <input type="hidden" name="sort_by" value={sortValue} /> : null}
      {extraHiddenInputs}
      <fieldset disabled={state.status === "loading"} className="m-0 min-w-0 flex-1 border-0 p-0">
        <div key={resetKey} className="divide-border divide-y">
          {availableFilters.map((filter) => (
            <Facet key={filter.id} filter={filter} state={state} idPrefix={idPrefix} />
          ))}
        </div>
      </fieldset>
      <noscript>
        <button
          type="submit"
          className="rounded-button button-primary focus-visible:outline-accent min-h-touch-target mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Apply filters
        </button>
      </noscript>
      {submitLabel ? (
        <div className="border-border shrink-0 border-t p-4">
          <button
            type="submit"
            className="rounded-button button-primary focus-visible:outline-accent min-h-touch-target inline-flex w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          >
            {submitLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function FilterDrawer({
  id,
  availableFilters,
  extraHiddenInputs,
  idPrefix = "collection-mobile",
  resetKeySuffix,
  sortOptions,
  defaultSortValue,
}: {
  id: string;
  availableFilters: CollectionPageData["availableFilters"];
  extraHiddenInputs?: ReactNode;
  idPrefix?: string;
  resetKeySuffix?: string;
  sortOptions?: readonly SortOption[];
  defaultSortValue?: string;
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
            aria-label="Close filters"
            onClick={() => closeDialog(id)}
          >
            <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FacetForm
            availableFilters={availableFilters}
            extraHiddenInputs={extraHiddenInputs}
            submitLabel="Show results"
            onAfterSubmit={() => closeDialog(id)}
            idPrefix={idPrefix}
            resetKeySuffix={resetKeySuffix}
            sortOptions={sortOptions}
            defaultSortValue={defaultSortValue}
          />
        </div>
      </div>
    </dialog>
  );
}

function filterLabel(filter: ProductFilter, currencyCode: string) {
  if (filter.available != null) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption) return `${filter.variantOption.name}: ${filter.variantOption.value}`;
  if (filter.price) {
    const min = filter.price.min;
    const max = filter.price.max;
    if (min != null && max != null) {
      return `${formatPrice({ amount: String(min), currencyCode })}–${formatPrice({ amount: String(max), currencyCode })}`;
    }
    if (min != null) return `${formatPrice({ amount: String(min), currencyCode })}+`;
    if (max != null) return `Under ${formatPrice({ amount: String(max), currencyCode })}`;
  }
  if (filter.productMetafield) return filter.productMetafield.value ?? filter.productMetafield.key;
  if (filter.variantMetafield) return filter.variantMetafield.value ?? filter.variantMetafield.key;
  if (filter.taxonomyMetafield) return filter.taxonomyMetafield.value;
  if (filter.category) return filter.category.id;
  return "Filter";
}

function normalizeRemovalHref(basePath: string, removal: string) {
  return removal === "?" ? basePath : `${basePath}${removal}`;
}

export function ActiveFilterChips({
  basePath,
  clearHref,
  currencyCode,
  preservedParams = [],
}: {
  basePath: string;
  clearHref: string;
  currencyCode: string;
  preservedParams?: HiddenInput[];
}) {
  const state: CollectionState = useCollection();
  if (state.filters.length === 0) return null;

  const currentParams = serializeCollectionParams(state);
  for (const param of preservedParams) currentParams.set(param.name, param.value);

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2"
      role="region"
      aria-label="Active filters"
    >
      {state.filters.map((filter, index) => {
        const label = filterLabel(filter, currencyCode);
        const removal = getFilterRemovalUrl(currentParams, filter);
        return (
          <Link
            key={`${label}:${index}`}
            href={normalizeRemovalHref(basePath, removal)}
            scroll={false}
            className="chip-filled min-h-touch-target inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
            aria-label={`Remove ${label} filter`}
          >
            {label}
            <img src="/icons/icon-x.svg" alt="" className="size-4" aria-hidden="true" />
          </Link>
        );
      })}
      <Link
        href={clearHref}
        scroll={false}
        className="text-accent min-h-touch-target inline-flex items-center text-sm hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}

function searchWithoutCursor(search: string) {
  const params = new URLSearchParams(search);
  params.delete("after");
  return params.toString();
}

function appendUniqueItems<T extends { id: string }>(current: T[], next: T[]) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

export function useLoadMore<T extends { id: string }>({
  initialItems,
  pageInfo,
  dataSearch,
}: {
  initialItems: T[];
  pageInfo: PageInfo;
  dataSearch: string;
}) {
  const resetKey = searchWithoutCursor(dataSearch);
  const [items, setItems] = useState(initialItems);
  const [currentPageInfo, setCurrentPageInfo] = useState(pageInfo);
  const [currentResetKey, setCurrentResetKey] = useState(resetKey);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (currentResetKey !== resetKey) {
      setItems(initialItems);
      setCurrentPageInfo(pageInfo);
      setCurrentResetKey(resetKey);
      setPending(false);
      return;
    }

    const hasCursor = new URLSearchParams(dataSearch).has("after");
    setItems((current) => (hasCursor ? appendUniqueItems(current, initialItems) : initialItems));
    setCurrentPageInfo(pageInfo);
    setPending(false);
  }, [currentResetKey, dataSearch, initialItems, pageInfo, resetKey]);

  return { items, pageInfo: currentPageInfo, pending, setPending };
}

export function LoadMore({
  pageInfo,
  pending,
  setPending,
  shownCount,
}: {
  pageInfo: PageInfo;
  pending: boolean;
  setPending: (pending: boolean) => void;
  shownCount: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const endCursor = pageInfo.endCursor;

  if (!pageInfo.hasNextPage || !endCursor) return null;

  const params = new URLSearchParams(searchParams.toString());
  params.set("after", endCursor);
  const nextSearch = params.toString();
  const href = `${pathname}${nextSearch ? `?${nextSearch}` : ""}`;

  return (
    <div className="mt-12 flex flex-col items-center gap-3">
      <p className="text-on-surface-secondary text-sm">Showing {shownCount}</p>
      <Link
        href={href}
        scroll={false}
        className="button-outline rounded-button focus-visible:outline-accent min-h-touch-target inline-flex cursor-pointer items-center justify-center gap-2 px-6 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
        aria-disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          if (pending) return;
          setPending(true);
          router.push(href, { scroll: false });
          router.refresh();
        }}
      >
        {pending ? "Loading…" : "Load more"}
      </Link>
    </div>
  );
}
