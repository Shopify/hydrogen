import type { CollectionStore } from "./collection";
import { collectionSearchEqual, mergeCollectionParams, normalizeCollectionSearch } from "./url";

/**
 * Functions that your framework adapter supplies. The reconciler calls them to read the store and the URL and to request navigation.
 */
export type ReconcilerCallbacks = {
  /** Returns the current collection store instance. */
  getStore: () => CollectionStore;
  /** Reads the live URL search string from the framework router. */
  readUrlSearch: () => string;
  /** Receives the search string to navigate to. The string starts with `?`, or is empty when no parameters remain. */
  emitChange: (searchString: string) => void;
};

/**
 * A state machine that keeps the URL, server data, and collection store in
 * sync during a chain of filter and sort changes.
 */
export type CollectionReconciler = {
  /**
   * Reconciles the URL with the store. Call the method whenever the URL search or the `dataSearch` string changes.
   * The browse change handler covers changes that start in the store.
   *
   * The method ignores intermediate URLs during rapid filter changes and treats unknown URLs as external navigation.
   */
  reconcile(urlSearch: string, dataSearch: string): void;
  /**
   * The browse change callback to register on the store. Merges the store's filters and sort into the
   * current URL parameters, tracks the pending navigation, and passes the new search string to `emitChange`.
   *
   * The handler clears the `before` and `after` pagination cursors and keeps every URL parameter that the store doesn't manage.
   */
  handleBrowseChange(): void;
  /**
   * Clears pending navigation state. Call the method when you replace the store.
   * @param newPrevUrlSearch - URL search string that the next reconcile call compares against.
   */
  reset(newPrevUrlSearch: string): void;
};

/**
 * Creates a framework-agnostic reconciler that keeps the URL, server data, and
 * collection store in sync during a chain of filter and sort changes.
 *
 * @param callbacks The functions that read the store and URL and deliver search string changes.
 * @param initialPrevUrlSearch The URL search string that the first reconcile call compares against. Defaults to an empty string.
 * @returns A reconciler with methods to reconcile URL changes, handle store browse changes, and reset pending state.
 *
 * @publicDocs
 */
export function createCollectionReconciler(
  callbacks: ReconcilerCallbacks,
  initialPrevUrlSearch = "",
): CollectionReconciler {
  let pendingFilter: string | null = null;
  let pendingUrls = new Set<string>();
  let prevUrlSearch = initialPrevUrlSearch;

  return {
    handleBrowseChange() {
      const store = callbacks.getStore();
      const merged = mergeCollectionParams(
        new URLSearchParams(callbacks.readUrlSearch()),
        store.getState(),
      );
      const searchString = merged.toString();
      pendingFilter = searchString;
      pendingUrls.add(searchString);
      callbacks.emitChange(searchString ? `?${searchString}` : "");
    },

    reset(newPrevUrlSearch: string) {
      pendingFilter = null;
      pendingUrls = new Set();
      prevUrlSearch = newPrevUrlSearch;
    },

    // State machine — four states:
    //
    //   ┌─────────────────────────────────────────────────────────────────────┐
    //   │ State A: No pending navigation (pendingFilter === null)            │
    //   │  • URL matches store → try settle if server data caught up         │
    //   │  • URL differs from store → syncFromParams, then try settle        │
    //   ├─────────────────────────────────────────────────────────────────────┤
    //   │ State B: Pending — URL matches target (pendingTargetMatchesUrl)    │
    //   │  • Server data matches URL → settle, clear pending state           │
    //   │  • Server data stale (intermediate) → re-dispatch to target        │
    //   │  • Server data not yet arrived → wait (keep pending set)           │
    //   ├─────────────────────────────────────────────────────────────────────┤
    //   │ State C: Pending — URL is intermediate (in pendingUrls)            │
    //   │  • Ignore URL change; if router settled here with server data      │
    //   │    confirming the intermediate, re-dispatch to the real target     │
    //   ├─────────────────────────────────────────────────────────────────────┤
    //   │ State D: Pending — URL is unknown (not in pendingUrls)             │
    //   │  • External navigation (back/forward, <Link>)                     │
    //   │  • Abandon pending state, fall through to State A                  │
    //   └─────────────────────────────────────────────────────────────────────┘
    //
    // Rapid toggles (A on → B on → A off) produce multiple in-flight navigations.
    // pendingFilter tracks the latest target; pendingUrls tracks every URL
    // dispatched in the chain so intermediates can be distinguished from external navs.
    reconcile(urlSearch: string, dataSearch: string) {
      const store = callbacks.getStore();

      const pendingSearchEquals = (search: string): boolean =>
        [...pendingUrls].some((pending) => collectionSearchEqual(pending, search));

      const pendingTargetMatchesUrl =
        pendingFilter != null && collectionSearchEqual(pendingFilter, urlSearch);

      const trySettleFromServer = (): boolean => {
        if (store.getState().status !== "loading") return false;
        if (!collectionSearchEqual(dataSearch, urlSearch)) return false;

        const incomingParams = new URLSearchParams(urlSearch);
        if (!store.matchesParams(incomingParams)) {
          store.syncFromParams(incomingParams);
        }

        store.settle();
        return true;
      };

      const clearPendingIfSettled = (): boolean => {
        if (!trySettleFromServer()) return false;
        pendingFilter = null;
        pendingUrls.clear();
        return true;
      };

      if (clearPendingIfSettled()) return;

      const normalizedUrlSearch = normalizeCollectionSearch(urlSearch);
      const normalizedPrevUrlSearch = normalizeCollectionSearch(prevUrlSearch);
      const urlSearchChanged = normalizedUrlSearch !== normalizedPrevUrlSearch;
      prevUrlSearch = urlSearch;

      const reDispatchToPendingTarget = () => {
        if (pendingFilter == null) return;
        callbacks.emitChange(pendingFilter ? `?${pendingFilter}` : "");
      };

      const routerSettledOnIntermediateWithStaleTarget =
        pendingFilter != null &&
        pendingSearchEquals(urlSearch) &&
        !pendingTargetMatchesUrl &&
        collectionSearchEqual(dataSearch, urlSearch);

      const serverConfirmedIntermediateWhileTargeting =
        pendingFilter != null &&
        pendingSearchEquals(dataSearch) &&
        !collectionSearchEqual(dataSearch, pendingFilter) &&
        !collectionSearchEqual(dataSearch, urlSearch);

      if (pendingTargetMatchesUrl) {
        if (trySettleFromServer()) {
          pendingFilter = null;
          pendingUrls.clear();
        } else if (
          store.getState().status === "loading" &&
          serverConfirmedIntermediateWhileTargeting
        ) {
          reDispatchToPendingTarget();
        }
        return;
      }

      if (pendingFilter != null) {
        if (!urlSearchChanged) {
          if (clearPendingIfSettled()) return;
          if (routerSettledOnIntermediateWithStaleTarget) {
            reDispatchToPendingTarget();
          }
          return;
        }

        if (pendingSearchEquals(urlSearch)) {
          if (clearPendingIfSettled()) return;
          if (routerSettledOnIntermediateWithStaleTarget) {
            reDispatchToPendingTarget();
          }
          return;
        }

        pendingFilter = null;
        pendingUrls.clear();
      }

      const incomingParams = new URLSearchParams(urlSearch);

      if (store.matchesParams(incomingParams)) {
        trySettleFromServer();
        return;
      }

      store.syncFromParams(incomingParams);
      trySettleFromServer();
    },
  };
}
