import type * as StandardEvents from "../../../vendor/standard-events";
import { getLogger } from "../logging";
import { importStandardEventsFromCDN } from "../shopify-scripts/standard-events";
import { browseStateFromParams } from "./collection";
import type { CollectionStore } from "./collection";
import type { CollectionViewOptions } from "./collection-view";
import type { CollectionState } from "./state";
import { browseStateEqual, serializeCollectionParams } from "./url";

const log = getLogger("collection");

const ABORT_MESSAGE =
  "The collection changed, or the updates were disconnected, before the update finished.";

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

type BrowseState = Pick<CollectionState, "filters" | "sortKey" | "reverse">;
type EventPayload = Omit<StandardEvents.CollectionUpdatePayload, "promise">;
type Update = {
  handle: string;
  resolve: (result: StandardEvents.CollectionUpdateResult) => void;
  reject: (reason: unknown) => void;
};

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
  const { target, getView, afterRender = (callback) => callback() } = options;
  let connected = true;
  let loaded: Pick<typeof StandardEvents, "CollectionUpdateEvent"> | undefined;
  let loadFailed = false;
  // The filters and sort of the last update, or of the last change without an update, as the URL
  // keeps them.
  let notified: BrowseState = urlBrowseState(store.getState());
  let checkScheduled = false;
  // Updates whose promise waits for the store to settle.
  let pending: Update[] = [];
  // Events that wait for the Standard Events module.
  let queue: {
    payload: EventPayload;
    promise: Promise<StandardEvents.CollectionUpdateResult>;
    update: Update;
  }[] = [];

  const remove = (update: Update) => {
    pending = pending.filter((candidate) => candidate !== update);
  };

  const abort = (updates: Update[]) => {
    pending = pending.filter((update) => !updates.includes(update));
    for (const update of updates) update.reject(new DOMException(ABORT_MESSAGE, "AbortError"));
  };

  const abortOtherCollections = () => {
    const { handle } = getView().collection;
    abort(pending.filter((update) => update.handle !== handle));
  };

  // A filter or sort change without `notify()`, such as back or forward navigation, leaves the
  // pending changes.
  const checkChangeWithoutNotify = () => {
    const state = urlBrowseState(store.getState());
    if (browseStateEqual(state, notified)) return;
    notified = state;
    abort(pending);
  };

  const resolvePending = () => {
    const updates = pending.slice();
    if (updates.length === 0) return;
    afterRender(() =>
      guard(() => {
        const { collection, productsCount } = getView();
        for (const update of updates) {
          if (!pending.includes(update)) continue;
          if (update.handle !== collection.handle) {
            abort([update]);
            continue;
          }
          remove(update);
          update.resolve({ productsCount });
        }
      }),
    );
  };

  const dispatchQueued = () => {
    const CollectionUpdateEvent = loaded?.CollectionUpdateEvent;
    if (!CollectionUpdateEvent) return;
    for (const { payload, promise, update } of queue.splice(0)) {
      try {
        target.dispatchEvent(new CollectionUpdateEvent({ ...payload, promise }));
      } catch (error) {
        remove(update);
        update.reject(error);
        log.error("collection update event failed", { error });
      }
    }
  };

  importStandardEventsFromCDN().then(
    (module) => {
      loaded = module;
      if (connected) dispatchQueued();
    },
    (error: unknown) => {
      loadFailed = true;
      for (const { update } of queue.splice(0)) {
        remove(update);
        update.reject(error);
      }
    },
  );

  // The store calls its subscribers before the browse change callback, so a change waits one
  // microtask for `notify()`.
  const unsubscribe = store.subscribe((state) =>
    guard(() => {
      if (pending.length > 0) abortOtherCollections();
      if (!checkScheduled && !browseStateEqual(urlBrowseState(state), notified)) {
        checkScheduled = true;
        queueMicrotask(() => {
          checkScheduled = false;
          if (connected) guard(checkChangeWithoutNotify);
        });
      }
      if (state.status === "idle") {
        checkChangeWithoutNotify();
        resolvePending();
      }
    }),
  );

  return {
    notify() {
      if (!connected || loadFailed) return;
      guard(() => {
        const state = store.getState();
        const urlState = urlBrowseState(state);
        if (browseStateEqual(urlState, notified)) return;
        notified = urlState;

        const { collection, productsCount } = getView();
        const payload: EventPayload = {
          collection: { id: collection.id, handle: collection.handle, productsCount },
        };
        if (state.filters.length > 0) payload.productFilters = state.filters;
        if (state.sortKey !== undefined) payload.sortKey = state.sortKey;

        // Not `Promise.withResolvers`, which older Safari versions don't have.
        let settlers: Pick<Update, "resolve" | "reject"> | undefined;
        const promise = new Promise<StandardEvents.CollectionUpdateResult>((resolve, reject) => {
          settlers = { resolve, reject };
        });
        if (!settlers) return;
        const { resolve, reject } = settlers;
        // Listeners still see the rejection. The empty handler keeps an AbortError without
        // listeners from being reported as an unhandled rejection.
        promise.catch(() => {});
        const update: Update = { handle: collection.handle, resolve, reject };
        pending.push(update);
        queue.push({ payload, promise, update });
        dispatchQueued();
      });
    },

    disconnect() {
      if (!connected) return;
      connected = false;
      unsubscribe();
      queue = [];
      abort(pending);
    },
  };
}

/**
 * Returns the filters and sort that the store keeps after it syncs from the URL of the state. Some
 * values don't survive the URL, such as sort keys that `parseCollectionParams` doesn't read and
 * category filters. When the store syncs from the new URL, these values go away, which must not
 * look like a change without `notify()`.
 */
function urlBrowseState(state: BrowseState): BrowseState {
  return browseStateFromParams(serializeCollectionParams(state));
}

// Analytics must never stop the navigation or the store updates.
function guard(run: () => void): void {
  try {
    run();
  } catch (error) {
    log.error("collection update failed", { error });
  }
}
