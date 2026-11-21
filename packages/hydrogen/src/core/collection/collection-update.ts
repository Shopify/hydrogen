import type * as StandardEvents from "../../../vendor/standard-events";
import type { CollectionStore } from "./collection";
import type { CollectionViewOptions } from "./collection-view";
import type { CollectionState } from "./state";
import { connectUpdateEvents, type UpdateEventConnection } from "./update-events";

/**
 * A collection store and the filter and sort changes that the customer makes in it. The collection
 * providers create one per store, and `CollectionView` and `SearchUpdates` connect to it.
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
export type CollectionUpdateConnection = UpdateEventConnection<CollectionViewOptions>;

type UpdatePayload = Omit<StandardEvents.CollectionUpdatePayload, "promise">;

/**
 * Sends a `shopify:collection:update` event from the element for each customer filter or sort
 * change in the source's store. Each event's promise resolves with the products count of the first
 * render after the store settles. A new collection handle rejects pending promises.
 *
 * @internal
 */
export function connectCollectionUpdates(
  source: CollectionUpdateSource,
  element: HTMLElement,
  initialView: CollectionViewOptions,
): CollectionUpdateConnection {
  return connectUpdateEvents(source, element, initialView, {
    getEventClass: (module) => module.CollectionUpdateEvent,
    createPayload,
    getResult: ({ productsCount }) => ({ productsCount }),
    getKey: ({ collection }) => collection.handle,
    abortMessage: "The collection changed or its view disconnected before the update finished.",
  });
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
