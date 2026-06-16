import type { CollectionStore } from "./collection";
import { collectionSearchEqual, mergeCollectionParams, normalizeCollectionSearch } from "./url";

export type ReconcilerCallbacks = {
  getStore: () => CollectionStore;
  readUrlSearch: () => string;
  emitChange: (searchString: string) => void;
};

export type CollectionReconciler = {
  /**
   * URL ↔ store reconciliation state machine. Call whenever urlSearch,
   * dataSearch, or store state changes.
   */
  reconcile(urlSearch: string, dataSearch: string): void;
  /**
   * Callback for {@link CollectionStore.setOnBrowseChange}. Merges current
   * URL params with store state, tracks the pending navigation, and emits.
   */
  handleBrowseChange(): void;
  /** Clears pending navigation state (call when the store is recreated). */
  reset(newPrevUrlSearch: string): void;
};

/**
 * Creates a framework-agnostic reconciler that manages the state machine for
 * keeping the URL, server data, and store in sync during browse-change chains.
 *
 * Framework adapters delegate to this so the reconciliation logic
 * lives in one place.
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
