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

/** Collection details from the framework loader for one collection fetch. */
export type CollectionData = {
  /**
   * URL-safe collection slug, such as `"shoes"`.
   *
   * On search pages, pass a handle such as `search:${term}` to keep separate filter and sort state for each search term. The collection provider creates a new store when the handle changes.
   */
  handle: string;
  /**
   * Search string that your loader fetched the data for, with or without a leading `?`.
   *
   * Pass the exact search string that your loader used for the Storefront API query. The reconciler settles the store only when this string and the live URL search describe the same filters, sort key, and sort direction.
   */
  dataSearch: string;
};

/**
 * A reactive, framework-agnostic store for the customer's filter and sort choices.
 *
 * Each mutation updates state synchronously and sets the status to `"loading"`. The framework adapter then navigates, the loader runs again, and the adapter settles the store when fresh data arrives.
 *
 * The store keeps the sort direction only for the price, title, created, and ID sort keys. For other sort keys, the store sets `reverse` to `false`. The store keeps at most one availability filter. Adding a second availability filter removes both availability filters.
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
   * Registers a listener that runs on every state change and returns an unsubscribe function.
   * @param listener - Callback that receives the new state.
   */
  subscribe(listener: (state: CollectionState) => void): () => void;

  /**
   * Replaces the active product filters and sets the status to `"loading"`.
   * Settle the store when the framework fetch completes.
   */
  setFilters(filters: ProductFilter[]): void;

  /**
   * Adds the filter when it isn't active and removes it when it is, then sets the status to `"loading"`.
   * Settle the store when the framework fetch completes.
   */
  toggleFilter(filter: ProductFilter): void;

  /**
   * Changes the sort key and direction, then sets the status to `"loading"`.
   * The store sorts in ascending order when you omit `reverse`. Settle the store when the framework fetch completes.
   */
  setSortKey(sortKey: ProductCollectionSortKeys, reverse?: boolean): void;

  /**
   * Clears all filters, restores the collection's default sort, and sets the status to `"loading"`.
   * Settle the store when the framework fetch completes.
   */
  reset(): void;

  /**
   * Returns `true` when the URL search parameters and the current state describe the same filters and sort.
   */
  matchesParams(searchParams: URLSearchParams): boolean;

  /**
   * Applies URL search parameters to the store when they differ from the current state.
   * Call the method when the router reports an external URL change, such as back or forward navigation. The store sets the status to `"loading"` and doesn't run the browse change callback.
   */
  syncFromParams(searchParams: URLSearchParams): void;

  /**
   * Sets the status back to `"idle"`. Call the method when the framework fetch completes.
   */
  settle(): void;

  /**
   * Returns the current filters and sort as URL search parameters.
   * The result includes only the `filter.*` and `sort_by` keys.
   */
  serializeToParams(): URLSearchParams;

  /**
   * Builds a URL query string from the store's filters and sort, minus the given filter.
   * Use the query string in remove-filter links and buttons.
   *
   * The result starts with `?` and omits URL parameters that the store doesn't manage.
   */
  getFilterRemovalUrl(filter: ProductFilter): string;

  /**
   * Applies the submitted form's filter and sort fields to the store.
   * The form's filter fields replace the active filters. The sort changes only when the form includes a `sort_by` field.
   *
   * The method doesn't cancel the event. Call `event.preventDefault()` first, or the browser submits the form and navigates away.
   *
   * @throws {TypeError} When the event target isn't a form element.
   */
  handleFormSubmit(event: SubmitEvent): void;

  /**
   * Replaces the callback that runs after filter and sort changes. Framework
   * adapters use the callback to navigate. Pass `null` to remove the callback.
   */
  setOnBrowseChange(callback: (() => void) | null): void;

  /**
   * Parses a filter value's `input` JSON string from the Storefront API and toggles the resulting filter.
   * Does nothing when the string isn't valid JSON.
   */
  toggleFilterInput(input: string): void;

  /**
   * Parses a Liquid-compatible `sort_by` value, such as `"price-ascending"`, and
   * applies its sort key and direction. An unrecognized value sets the sort key to `COLLECTION_DEFAULT`.
   */
  setSortByValue(sortByValue: string): void;
};

/** Collection store methods that change filters and sort. */
export type CollectionActions = Pick<
  CollectionStore,
  | "setFilters"
  | "toggleFilter"
  | "toggleFilterInput"
  | "setSortKey"
  | "setSortByValue"
  | "reset"
  | "handleFormSubmit"
>;

/** Options for creating a collection store. */
export type CreateCollectionStoreOptions = {
  /** Collection metadata from the framework loader. */
  data: CollectionData;
  /**
   * Live URL search string from the framework router, with or without a leading `?`.
   * Defaults to the `dataSearch` string from `data`.
   */
  urlSearch?: string;
  /**
   * Runs after each filter or sort change from a store method.
   * Framework adapters use the callback to navigate. Syncing from URL parameters and settling the store don't run the callback.
   */
  onBrowseChange?: () => void;
};

type CollectionStoreContext = {
  observable: ReturnType<typeof createObservable<CollectionState>>;
  handle: string;
  onBrowseChange: (() => void) | null;
};

/**
 * Creates a store that holds the filter and sort choices for one collection. The store holds no products. Your framework's loader fetches the products.
 *
 * The store reads its initial filters and sort from the URL search string. Without a URL search string, the store reads them from the data's search string.
 *
 * @param options The collection data, live URL search string, and browse change callback for the store.
 * @returns A store with methods that read, change, and settle the filters and sort.
 * @example
 * ```ts
 * const store = createCollectionStore({
 *   data: loaderData.collection,
 *   urlSearch: window.location.search,
 *   onBrowseChange: () => navigate({ search: store.serializeToParams().toString() }),
 * });
 *
 * store.subscribe((state) => renderFilters(state.filters));
 * ```
 * @publicDocs
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
