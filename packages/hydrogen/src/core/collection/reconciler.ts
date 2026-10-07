import type { CollectionStore } from "./collection";
import { collectionSearchEqual, mergeCollectionParams, normalizeCollectionSearch } from "./url";

/**
 * Functions that connect a collection reconciler to your router and your collection store.
 */
export type ReconcilerCallbacks = {
  /** Returns the collection store. */
  getStore: () => CollectionStore;
  /** Returns the current URL search string from your router. */
  readUrlSearch: () => string;
  /** Navigates your router to the search string. The string starts with `?`, or is empty when no params remain. */
  emitChange: (searchString: string) => void;
};

/**
 * Keeps the URL, your loader data, and a collection store in sync while the customer changes filters and sort.
 */
export type CollectionReconciler = {
  /**
   * Brings the store in line with the URL. Call the method each time the URL search or the `dataSearch` string changes.
   *
   * The method settles the store when your loader data matches the URL. During rapid filter changes, the method skips intermediate URLs. A URL that the reconciler didn't request counts as external navigation, such as back or forward.
   */
  reconcile(urlSearch: string, dataSearch: string): void;
  /**
   * Builds the next search string from the store's filters and sort, and passes the string to `emitChange`. Register the method as the store's browse change callback.
   *
   * The new search string keeps every URL param that the store doesn't manage and drops the `before` and `after` pagination cursors.
   */
  handleBrowseChange(): void;
  /**
   * Clears pending navigation. Call the method when you replace the store.
   * @param newPrevUrlSearch - Current URL search string, which the next `reconcile()` call compares against.
   */
  reset(newPrevUrlSearch: string): void;
};

/**
 * Creates a reconciler that keeps the URL, your loader data, and a collection store in sync while the customer changes filters and sort.
 *
 * Use a reconciler to connect a collection store to a router that has no Hydrogen binding. In React, use CollectionProvider.
 *
 * @param callbacks The functions that return the store and the URL search string and navigate your router.
 * @param initialPrevUrlSearch The current URL search string, which the first `reconcile()` call compares against. Defaults to an empty string.
 * @returns A reconciler. Call `reconcile()` on URL changes, and register `handleBrowseChange()` as the store's browse change callback.
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
