import type * as StandardEvents from "../../../vendor/standard-events";
import { importStandardEventsFromCDN } from "../shopify-scripts/standard-events";
import type { CollectionStore } from "./collection";
import type { CollectionViewOptions } from "./collection-view";
import type { CollectionState } from "./state";
import { filtersEqual } from "./url";

/**
 * A collection store and the filter and sort changes that the customer makes in it. The collection
 * providers create one per store, and `CollectionView` connects to it.
 *
 * @internal
 */
export type CollectionUpdateSource = {
  store: CollectionStore;
  /** Calls the listener after each customer filter or sort change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Call from the store's browse change callback. */
  notify(): void;
};

/** @internal */
export function createCollectionUpdateSource(store: CollectionStore): CollectionUpdateSource {
  const listeners = new Set<() => void>();
  return {
    store,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
}

/** @internal */
export type CollectionUpdateConnection = {
  /**
   * Call after each render with the rendered collection and products count. When the store is
   * idle, pending update promises resolve with the products count. A new collection handle rejects
   * them with an `AbortError`.
   */
  update(view: CollectionViewOptions): void;
  /** Stops the events and rejects pending update promises with an `AbortError`. */
  disconnect(): void;
};

type UpdatePayload = Omit<StandardEvents.CollectionUpdatePayload, "promise">;
type Settlers = Pick<
  ReturnType<typeof StandardEvents.CollectionUpdateEvent.createPromise>,
  "resolve" | "reject"
>;

/**
 * Sends a `shopify:collection:update` event from the element for each customer filter or sort
 * change in the source's store. Each event's promise resolves with the products count of the first
 * render after the store settles.
 *
 * @internal
 */
export function connectCollectionUpdates(
  source: CollectionUpdateSource,
  element: HTMLElement,
  initialView: CollectionViewOptions,
): CollectionUpdateConnection {
  let view = initialView;
  let module: typeof StandardEvents | undefined;
  let connected = true;
  let pending: Settlers[] = [];
  // Products count of the latest render with an idle store, for events that send after the module loads.
  let settledCount: number | undefined;
  let previous = source.store.getState();
  let current = previous;

  const loading = importStandardEventsFromCDN().then(
    (loaded) => {
      module = loaded;
    },
    () => {},
  );

  const settle = (productsCount: number) => {
    for (const { resolve } of pending) resolve({ productsCount });
    pending = [];
  };

  const abort = () => {
    for (const { reject } of pending) {
      reject(
        new DOMException(
          "The collection changed or its view disconnected before the update finished.",
          "AbortError",
        ),
      );
    }
    pending = [];
  };

  const dispatch = (payload: UpdatePayload) => {
    if (!connected || !module) return;
    const { promise, resolve, reject } = module.CollectionUpdateEvent.createPromise();
    // Listeners still see the rejection. The empty handler keeps an AbortError without listeners
    // from being reported as an unhandled rejection.
    promise.catch(() => {});
    pending.push({ resolve, reject });
    element.dispatchEvent(new module.CollectionUpdateEvent({ ...payload, promise }));
    if (settledCount !== undefined) settle(settledCount);
  };

  const unsubscribeStore = source.store.subscribe((state) => {
    previous = current;
    current = state;
  });

  const unsubscribeSource = source.subscribe(() => {
    if (sameBrowseState(previous, current)) return;
    settledCount = undefined;
    const payload = createPayload(view, current);
    if (module) dispatch(payload);
    else void loading.then(() => dispatch(payload));
  });

  return {
    update(nextView) {
      // Updates for the previous collection never finish when the collection changes.
      if (nextView.collection.handle !== view.collection.handle) abort();
      view = nextView;
      settledCount = source.store.getState().status === "idle" ? nextView.productsCount : undefined;
      if (settledCount !== undefined) settle(settledCount);
    },
    disconnect() {
      connected = false;
      unsubscribeStore();
      unsubscribeSource();
      abort();
    },
  };
}

function sameBrowseState(a: CollectionState, b: CollectionState): boolean {
  return a.sortKey === b.sortKey && a.reverse === b.reverse && filtersEqual(a.filters, b.filters);
}

function createPayload(
  { collection, productsCount }: CollectionViewOptions,
  { filters, sortKey }: CollectionState,
): UpdatePayload {
  const payload: UpdatePayload = {
    collection: { id: collection.id, handle: collection.handle, productsCount },
  };
  if (filters.length > 0) payload.productFilters = filters;
  if (sortKey) payload.sortKey = sortKey;
  return payload;
}
