import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";
import { createObservable } from "../observable";
import type { CollectionState, ProductFilter } from "./state";
import { createInitialCollectionState } from "./state";
import {
  collectionParamsMatchState,
  filterEquals,
  getFilterRemovalUrl,
  isDirectionalSortKey,
  parseCollectionParams,
  parseSortByValue,
  serializeCollectionParams,
} from "./url";

/** Snapshot from the framework loader for a single collection fetch. */
export type CollectionData = {
  /** URL-safe collection slug (e.g. `"shoes"`). */
  handle: string;
  /**
   * Search string this data snapshot was fetched for (with or without leading `?`).
   * Compared against live {@link CreateCollectionStoreOptions.urlSearch} before settling.
   */
  dataSearch: string;
};

/**
 * A reactive, framework-agnostic store for collection browse state.
 *
 * Manages filters and sorting — the user's *intent*. Server response
 * data (products, productsCount, availableFilters) lives in the framework's
 * loader data, not here.
 *
 * Mutations are synchronous state changes that set `status: "loading"`.
 * The framework adapter navigates (URL change), the framework loader re-runs,
 * and the adapter calls {@link settle} when fresh data arrives.
 *
 * @example
 * ```ts
 * const store = createCollectionStore({
 *   data: { handle: "shoes", dataSearch: "" },
 * });
 *
 * store.setFilters([{ tag: "sale" }]); // status → "loading"
 * // ...framework fetches...
 * store.settle(); // status → "idle"
 * ```
 */
export type CollectionStore = {
  /** Returns the current snapshot of collection browse state. */
  getState(): CollectionState;

  /**
   * Registers a listener invoked on every state change. Returns an unsubscribe function.
   * @param listener - Callback receiving the new state snapshot
   */
  subscribe(listener: (state: CollectionState) => void): () => void;

  /**
   * Replaces the active product filters.
   * Sets `status: "loading"` — call {@link settle} when the framework fetch completes.
   */
  setFilters(filters: ProductFilter[]): void;

  /**
   * Adds the filter if not active, removes it if already active.
   * Sets `status: "loading"` — call {@link settle} when the framework fetch completes.
   */
  toggleFilter(filter: ProductFilter): void;

  /**
   * Changes the sort order.
   * Sets `status: "loading"` — call {@link settle} when the framework fetch completes.
   */
  setSortKey(sortKey: ProductCollectionSortKeys, reverse?: boolean): void;

  /**
   * Resets filters and sort to defaults.
   * Sets `status: "loading"` — call {@link settle} when the framework fetch completes.
   */
  reset(): void;

  /**
   * Returns `true` when URL params and current browse state describe the same filters and sort.
   */
  matchesParams(searchParams: URLSearchParams): boolean;

  /**
   * Applies URL search params to the store when they differ from current state.
   * Used when the framework router reports an external URL change (back/forward).
   */
  syncFromParams(searchParams: URLSearchParams): void;

  /**
   * Signals that the framework fetch completed and fresh data is available.
   * Resets `status` to `"idle"`.
   */
  settle(): void;

  /**
   * Serializes the store's current filter/sort state into URL search params.
   * Only includes store-owned keys (`filter.*`, `sort_by`).
   */
  serializeToParams(): URLSearchParams;

  /**
   * Builds a URL string that removes the given filter from the current params.
   * Useful for rendering "remove filter" links/buttons.
   */
  getFilterRemovalUrl(filter: ProductFilter): string;

  /**
   * Parses `FormData` from the submitted form into collection params and applies them.
   * Callers must call `event.preventDefault()` before invoking this method.
   */
  handleFormSubmit(event: SubmitEvent): void;

  /**
   * Replaces the callback that runs after user filter/sort changes. Framework
   * adapters use this to trigger navigation. Pass `null` to remove.
   */
  setOnBrowseChange(callback: (() => void) | null): void;

  /**
   * Parses a Storefront API filter input JSON string (e.g. from
   * `FilterValue.input`) and toggles the resulting filter.
   * No-op if `input` is not valid JSON.
   */
  toggleFilterInput(input: string): void;

  /**
   * Parses a Liquid-compatible `sort_by` value (e.g. `"price-ascending"`) and
   * applies the corresponding sort key and direction.
   */
  setSortByValue(sortByValue: string): void;
};

/** Options for creating a new {@link CollectionStore}. */
export type CreateCollectionStoreOptions = {
  /** Collection metadata from the framework loader. */
  data: CollectionData;
  /**
   * Live URL search string from the framework router (with or without leading `?`).
   * Falls back to `data.dataSearch` when omitted.
   */
  urlSearch?: string;
  /**
   * Called after user-initiated filter/sort changes.
   * Framework adapters use this to trigger navigation. Not called by
   * {@link CollectionStore.syncFromParams} or {@link CollectionStore.settle}.
   */
  onBrowseChange?: () => void;
};

type CollectionStoreContext = {
  observable: ReturnType<typeof createObservable<CollectionState>>;
  handle: string;
  onBrowseChange: (() => void) | null;
};

/**
 * Creates a new collection store for the given collection handle.
 *
 * The store manages browse intent (filters, sort) only.
 * Server response data lives in the framework's loader.
 */
export function createCollectionStore(options: CreateCollectionStoreOptions): CollectionStore {
  const initialState = buildInitialState(options);

  const context: CollectionStoreContext = {
    observable: createObservable<CollectionState>(initialState),
    handle: options.data.handle,
    onBrowseChange: options.onBrowseChange ?? null,
  };

  return {
    getState: () => context.observable.state,
    subscribe: (listener) => context.observable.subscribe(listener),
    setFilters: (filters) => applyBrowseChange(context, { filters: normalizeFilters(filters) }),
    toggleFilter: (filter) => toggleFilter(context, filter),
    setSortKey: (sortKey, reverse) =>
      applyBrowseChange(context, { sortKey, reverse: reverse ?? false }),
    reset: () => resetStore(context),
    matchesParams: (searchParams) => matchesParams(context, searchParams),
    syncFromParams: (searchParams) => syncFromParams(context, searchParams),
    settle: () => settleStore(context),
    serializeToParams: () => serializeCollectionParams(context.observable.state),
    getFilterRemovalUrl: (filter) =>
      getFilterRemovalUrl(serializeCollectionParams(context.observable.state), filter),
    handleFormSubmit: (event) => handleFormSubmit(context, event),
    setOnBrowseChange: (callback) => {
      context.onBrowseChange = callback;
    },
    toggleFilterInput: (input) => toggleFilterInput(context, input),
    setSortByValue: (sortByValue) => setSortByValue(context, sortByValue),
  };
}

function buildInitialState(options: CreateCollectionStoreOptions): CollectionState {
  const base = createInitialCollectionState(options.data.handle);

  const search = options.urlSearch ?? options.data.dataSearch;
  if (search) {
    const parsed = parseCollectionParams(new URLSearchParams(search));
    base.filters = parsed.filters;
    base.sortKey = parsed.sortKey;
    base.reverse = normalizeReverse(parsed.sortKey, parsed.reverse);
  }

  return base;
}

type BrowseChange = Partial<Pick<CollectionState, "filters" | "sortKey" | "reverse">>;

/**
 * Drops `reverse` for sort keys that do not support direction.
 * Only `PRICE`, `TITLE`, `CREATED`, and `ID` honor ascending/descending.
 *
 * @example normalizeReverse("BEST_SELLING", true) // → false
 * @example normalizeReverse("PRICE", true) // → true
 */
function normalizeReverse(
  sortKey: ProductCollectionSortKeys | undefined,
  reverse: boolean,
): boolean {
  if (!sortKey || !isDirectionalSortKey(sortKey)) return false;
  return reverse;
}

function applyBrowseChange(
  context: CollectionStoreContext,
  change: BrowseChange,
  notify = true,
): void {
  context.observable.setState((prev) => {
    const merged = { ...prev, ...change, status: "loading" as const };
    merged.reverse = normalizeReverse(merged.sortKey, merged.reverse);
    return merged;
  });
  if (notify) {
    context.onBrowseChange?.();
  }
}

function toggleFilter(context: CollectionStoreContext, filter: ProductFilter): void {
  const current = context.observable.state.filters;
  const isActive = current.some((f) => filterEquals(f, filter));

  const next = isActive
    ? current.filter((f) => !filterEquals(f, filter))
    : normalizeFilters([...current, filter]);

  applyBrowseChange(context, { filters: next });
}

function normalizeFilters(filters: ProductFilter[]): ProductFilter[] {
  const normalized: ProductFilter[] = [];

  for (const filter of filters) {
    if (filter.available != null) {
      // Availability is a single boolean facet. Duplicate availability params
      // (filter.v.availability=1&filter.v.availability=0) mean no filter, so
      // keeping both values here prevents the provider from settling navigation.
      const existingAvailabilityIndex = normalized.findIndex((candidate) => {
        return candidate.available != null;
      });

      if (existingAvailabilityIndex !== -1) {
        normalized.splice(existingAvailabilityIndex, 1);
        continue;
      }
    }

    normalized.push(filter);
  }

  return normalized;
}

function resetStore(context: CollectionStoreContext): void {
  const initial = createInitialCollectionState(context.handle);
  applyBrowseChange(context, {
    filters: initial.filters,
    sortKey: initial.sortKey,
    reverse: initial.reverse,
  });
}

function matchesParams(context: CollectionStoreContext, searchParams: URLSearchParams): boolean {
  return collectionParamsMatchState(searchParams, context.observable.state);
}

function syncFromParams(context: CollectionStoreContext, searchParams: URLSearchParams): void {
  if (matchesParams(context, searchParams)) return;

  const parsed = parseCollectionParams(searchParams);

  // URL caught up to an in-flight browse change — align state without re-entering loading.
  if (context.observable.state.status === "loading") {
    context.observable.setState((prev) => ({
      ...prev,
      filters: parsed.filters,
      sortKey: parsed.sortKey,
      reverse: normalizeReverse(parsed.sortKey, parsed.reverse),
      status: "loading",
    }));
    return;
  }

  /**
   * URL already changes, so we don't need to notify to call onBrowseChange
   * again which would cause a double navigate.
   */
  applyBrowseChange(
    context,
    {
      filters: parsed.filters,
      sortKey: parsed.sortKey,
      reverse: parsed.reverse,
    },
    false,
  );
}

function settleStore(context: CollectionStoreContext): void {
  context.observable.setState((prev) => {
    if (prev.status === "idle") return prev;
    return { ...prev, status: "idle" };
  });
}

function handleFormSubmit(context: CollectionStoreContext, event: SubmitEvent): void {
  if (!(event.target instanceof HTMLFormElement)) {
    throw new TypeError(`Expected event.target to be an HTMLFormElement, got ${event.target}`);
  }

  const formData = new FormData(event.target);
  const formParams = new URLSearchParams();

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      formParams.append(key, value);
    }
  }

  const parsed = parseCollectionParams(formParams);

  const change: BrowseChange = {
    filters: normalizeFilters(parsed.filters),
  };

  if (formParams.has("sort_by")) {
    change.sortKey = parsed.sortKey;
    change.reverse = parsed.reverse;
  }

  applyBrowseChange(context, change);
}

function toggleFilterInput(context: CollectionStoreContext, input: string): void {
  let parsed: ProductFilter;
  try {
    parsed = JSON.parse(input) as ProductFilter;
  } catch {
    return;
  }
  toggleFilter(context, parsed);
}

function setSortByValue(context: CollectionStoreContext, sortByValue: string): void {
  const { sortKey, reverse } = parseSortByValue(sortByValue);
  applyBrowseChange(context, {
    sortKey: sortKey ?? "COLLECTION_DEFAULT",
    reverse: reverse ?? false,
  });
}
