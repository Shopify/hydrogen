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

/** The collection handle and the search string that your loader fetched products for. */
export type CollectionData = {
  /**
   * Collection handle, such as `"shoes"`.
   *
   * On search pages, pass a handle such as `search:${term}` to keep separate filter and sort state for each search term. When the handle changes, the collection provider reads the filters and sort from the URL again.
   */
  handle: string;
  /**
   * Search string that your loader used for the Storefront API query, with or without a leading `?`.
   *
   * Pass the exact string. The status stays `"loading"` until this string and the URL search hold the same filters, sort key, and sort direction.
   */
  dataSearch: string;
};

/**
 * Holds the customer's filter and sort choices for a collection or search page, and reports when new results are loading.
 *
 * Each change updates the state right away and sets the status to `"loading"`. Your app then navigates, your loader fetches the new products, and you call `settle()` when the data arrives. The collection provider navigates and settles the store for you.
 *
 * The store keeps the sort direction only for the price, title, created, and ID sort keys. For other sort keys, `reverse` reads `false`. The store keeps at most one availability filter. Adding a second availability filter removes both availability filters.
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
  /** Returns the current filter and sort state. */
  getState(): CollectionState;

  /**
   * Calls the listener on every state change. Returns a function that unsubscribes the listener.
   * @param listener - Callback that receives the new state.
   */
  subscribe(listener: (state: CollectionState) => void): () => void;

  /**
   * Replaces the active filters and sets the status to `"loading"`.
   */
  setFilters(filters: ProductFilter[]): void;

  /**
   * Adds the filter when it's inactive and removes the filter when it's active, then sets the status to `"loading"`.
   */
  toggleFilter(filter: ProductFilter): void;

  /**
   * Changes the sort key and direction, then sets the status to `"loading"`.
   * Omit `reverse` to sort in ascending order.
   */
  setSortKey(sortKey: ProductCollectionSortKeys, reverse?: boolean): void;

  /**
   * Clears all filters, restores the collection's default sort, and sets the status to `"loading"`.
   */
  reset(): void;

  /**
   * Returns `true` when the URL search params hold the same filters and sort as the store.
   */
  matchesParams(searchParams: URLSearchParams): boolean;

  /**
   * Updates the store from URL search params that differ from the current state.
   * Call the method when the URL changes outside the store, such as on back or forward navigation. The method sets the status to `"loading"` and skips the browse change callback.
   */
  syncFromParams(searchParams: URLSearchParams): void;

  /**
   * Sets the status to `"idle"`. Call the method when your loader returns the new products.
   */
  settle(): void;

  /**
   * Returns the filters and sort as URL search params.
   * The result holds only the `filter.*` and `sort_by` keys.
   */
  serializeToParams(): URLSearchParams;

  /**
   * Returns a query string with the store's filters and sort, minus the given filter.
   * Use the query string in remove-filter links and buttons.
   *
   * The string starts with `?` and leaves out URL params that the store doesn't manage.
   */
  getFilterRemovalUrl(filter: ProductFilter): string;

  /**
   * Applies a submitted filter form to the store.
   * The form's filter fields replace the active filters. The sort changes only when the form includes a `sort_by` field.
   *
   * Call `event.preventDefault()` first, or the browser submits the form and leaves the page. The method throws a `TypeError` when the event target isn't a form element.
   */
  handleFormSubmit(event: SubmitEvent): void;

  /**
   * Sets the callback that runs after each filter or sort change. Navigate to the new URL in the callback.
   * Pass `null` to remove the callback.
   */
  setOnBrowseChange(callback: (() => void) | null): void;

  /**
   * Toggles the filter in a filter value's `input` JSON string from the Storefront API.
   * The method does nothing when the string isn't valid JSON.
   */
  toggleFilterInput(input: string): void;

  /**
   * Applies the sort key and direction from a Liquid-compatible `sort_by` value, such as `"price-ascending"`.
   * An unrecognized value sets the sort key to `COLLECTION_DEFAULT`.
   */
  setSortByValue(sortByValue: string): void;
};

/** Collection store methods that change the filters and sort. The useCollectionActions hook returns these methods. */
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

/** Options for createCollectionStore. */
export type CreateCollectionStoreOptions = {
  /** The collection handle and the search string that your loader fetched products for. */
  data: CollectionData;
  /**
   * Current URL search string from your router, with or without a leading `?`.
   * Defaults to the `dataSearch` string from `data`.
   */
  urlSearch?: string;
  /**
   * Runs after each filter or sort change from a store method. Navigate to the new URL in the callback.
   * Syncing from URL params and settling the store don't run the callback.
   */
  onBrowseChange?: () => void;
};

type CollectionStoreContext = {
  observable: ReturnType<typeof createObservable<CollectionState>>;
  handle: string;
  onBrowseChange: (() => void) | null;
};

/**
 * Creates a store that holds the customer's filter and sort choices for one collection. Your loader fetches the products.
 *
 * The store reads its starting filters and sort from `urlSearch`, or from `dataSearch` when you omit `urlSearch`. In React, use CollectionProvider, which creates the store for you and keeps the store in sync with the URL.
 *
 * @param options The collection data, the current URL search string, and the browse change callback.
 * @returns A store with methods that change the filters and sort and report the loading status.
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
