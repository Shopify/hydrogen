import type * as StandardEvents from "../../../vendor/standard-events";
import type { CollectionStore } from "./collection";
import { connectUpdateEvents, type UpdateEventsSpec } from "./update-events";

/** The search term and the total number of results that the search page shows. */
export interface SearchUpdatesView {
  /** Search term of the results. The search update events send it as `search.query`. */
  query: string;
  /** Total number of results, from the `totalCount` field of the Storefront API `search` query. */
  totalCount: number;
}

/** Options for `connectSearchUpdates`. */
export interface ConnectSearchUpdatesOptions {
  /**
   * The element that contains the search filters, the results, and the empty state. The events are
   * dispatched from this element and bubble to the document.
   */
  target: HTMLElement;
  /**
   * Returns the search term and the total number of results that the page shows now. Read the
   * count from the same data as the results, not from the DOM.
   */
  getView: () => SearchUpdatesView;
  /**
   * Runs the callback after the page renders the new total count. The function calls it when the
   * store settles, to resolve the update promises. Defaults to calling it right away. Pass a
   * function such as Vue's `nextTick` when the store settles before the page renders the new
   * count.
   */
  afterRender?: (callback: () => void) => void;
}

/** The connection that `connectSearchUpdates` returns. */
export interface SearchUpdatesConnection {
  /**
   * Sends one `shopify:search:update` event for the current filters and sort of the store. Call it
   * in the store's browse change callback, before you navigate. It does nothing when the filters
   * and sort didn't change, and it never throws.
   */
  notify(): void;
  /** Stops the updates and rejects the pending update promises with an `AbortError`. */
  disconnect(): void;
}

type EventPayload = Omit<StandardEvents.SearchUpdatePayload, "promise">;

/**
 * Sends Shopify's `shopify:search:update` event for each filter or sort change that the customer
 * makes on the search page. Use the function on a framework without a Hydrogen binding. In React
 * and Vue, `SearchUpdates` calls it for you.
 *
 * Call `notify()` in the store's browse change callback, before your navigation. Each event has
 * the search term, the active filters, and the sort key: `PRICE` for price sorts, `RELEVANCE` for
 * other sorts, left out for the default sort. Its promise resolves with `{ totalCount }` from
 * `getView()` when the store settles, including `0`. The promise rejects with an `AbortError` when
 * the search term changes, when the filters or sort change without `notify()`, such as on back and
 * forward navigation, and on `disconnect()`.
 *
 * The function loads Shopify's Standard Events module. Events wait for the module and keep their
 * order. When the module can't load, the function sends no events.
 *
 * @param store - The collection store of the search page.
 * @param options - The element to dispatch the events from, and a function that returns the search term and the total count.
 * @returns A connection with `notify()` and `disconnect()`.
 * @example
 * ```ts
 * const updates = connectSearchUpdates(store, {
 *   target: filtersAndResultsElement,
 *   getView: () => ({ query: term, totalCount }),
 * });
 * store.setOnBrowseChange(() => {
 *   updates.notify();
 *   reconciler.handleBrowseChange();
 * });
 * // On cleanup:
 * updates.disconnect();
 * ```
 * @publicDocs
 */
export function connectSearchUpdates(
  store: CollectionStore,
  options: ConnectSearchUpdatesOptions,
): SearchUpdatesConnection {
  return connectUpdateEvents(store, options, searchUpdatesSpec);
}

const searchUpdatesSpec: UpdateEventsSpec<
  SearchUpdatesView,
  EventPayload,
  StandardEvents.SearchUpdateResult
> = {
  name: "search update",
  getEventClass: (module) => module.SearchUpdateEvent,
  createPayload: ({ query }, { filters, sortKey }) => {
    const search: EventPayload["search"] = { query };
    if (filters.length > 0) search.productFilters = filters;
    // Search sorts only by relevance or price. Standard Events' `getSortKey` maps sort values the
    // same way.
    if (sortKey !== undefined) search.sortKey = sortKey === "PRICE" ? "PRICE" : "RELEVANCE";
    return { search };
  },
  getResult: ({ totalCount }) => ({ totalCount }),
  getKey: ({ query }) => query,
  abortMessage:
    "The search term changed, or the updates were disconnected, before the update finished.",
};
