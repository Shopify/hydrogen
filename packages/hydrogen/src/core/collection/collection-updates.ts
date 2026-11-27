import type * as StandardEvents from "../../../vendor/standard-events";
import type { CollectionStore } from "./collection";
import type { CollectionViewOptions } from "./collection-view";
import { connectUpdateEvents, type UpdateEventsSpec } from "./update-events";

/** Options for `connectCollectionUpdates`. */
export interface ConnectCollectionUpdatesOptions {
  /**
   * The element that contains the filter and sort controls. The events are dispatched from this
   * element and bubble to the document.
   */
  target: HTMLElement;
  /**
   * Returns the collection and the number of products that the page shows now. Read the count from
   * the same data as the results, not from the DOM.
   */
  getView: () => CollectionViewOptions;
  /**
   * Runs the callback after the page renders the new products count. The function calls it when
   * the store settles, to resolve the update promises. Defaults to calling it right away. Pass a
   * function such as Vue's `nextTick` when the store settles before the page renders the new
   * count.
   */
  afterRender?: (callback: () => void) => void;
}

/** The connection that `connectCollectionUpdates` returns. */
export interface CollectionUpdatesConnection {
  /**
   * Sends one `shopify:collection:update` event for the current filters and sort of the store.
   * Call it in the store's browse change callback, before you navigate. It does nothing when the
   * filters and sort didn't change, and it never throws.
   */
  notify(): void;
  /** Stops the updates and rejects the pending update promises with an `AbortError`. */
  disconnect(): void;
}

/**
 * Sends Shopify's `shopify:collection:update` event for each filter or sort change that the
 * customer makes. Use the function on a framework without a Hydrogen binding. In React and Vue,
 * `CollectionView` calls it for you.
 *
 * Call `notify()` in the store's browse change callback, before your navigation. Each event has
 * the filters, the sort key, and the products count before the change. Its promise resolves with
 * `{ productsCount }` from `getView()` when the store settles. The promise rejects with an
 * `AbortError` when the collection handle changes, when the filters or sort change without
 * `notify()`, such as on back and forward navigation, and on `disconnect()`. Syncing the store from
 * the URL doesn't call the browse change callback, so it sends nothing.
 *
 * The function loads Shopify's Standard Events module. Events wait for the module and keep their
 * order. When the module can't load, the function sends no events.
 *
 * @param store - The collection store of the page.
 * @param options - The element to dispatch the events from, and a function that returns the collection and its products count.
 * @returns A connection with `notify()` and `disconnect()`.
 * @example
 * ```ts
 * const updates = connectCollectionUpdates(store, {
 *   target: filtersAndResultsElement,
 *   getView: () => ({ collection, productsCount: products.length }),
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
export function connectCollectionUpdates(
  store: CollectionStore,
  options: ConnectCollectionUpdatesOptions,
): CollectionUpdatesConnection {
  return connectUpdateEvents(store, options, collectionUpdatesSpec);
}

const collectionUpdatesSpec: UpdateEventsSpec<
  CollectionViewOptions,
  Omit<StandardEvents.CollectionUpdatePayload, "promise">,
  StandardEvents.CollectionUpdateResult
> = {
  name: "collection update",
  getEventClass: (module) => module.CollectionUpdateEvent,
  createPayload: ({ collection, productsCount }, { filters, sortKey }) => {
    const payload: Omit<StandardEvents.CollectionUpdatePayload, "promise"> = {
      collection: { id: collection.id, handle: collection.handle, productsCount },
    };
    if (filters.length > 0) payload.productFilters = filters;
    if (sortKey !== undefined) payload.sortKey = sortKey;
    return payload;
  },
  getResult: ({ productsCount }) => ({ productsCount }),
  getKey: ({ collection }) => collection.handle,
  abortMessage:
    "The collection changed, or the updates were disconnected, before the update finished.",
};
