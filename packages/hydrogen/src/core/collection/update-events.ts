import type * as StandardEvents from "../../../vendor/standard-events";
import { getLogger } from "../logging";
import { importStandardEventsFromCDN } from "../shopify-scripts/standard-events";
import type { CollectionStore } from "./collection";
import type { CollectionState } from "./state";
import { browseStateEqual } from "./url";

const log = getLogger("collection");

/** The filters and sort of a collection store. */
export type BrowseState = Pick<CollectionState, "filters" | "sortKey" | "reverse">;

/** The options that the caller of a `connect*Updates` function gives. */
export interface UpdateEventsOptions<View> {
  /** The element that the events are dispatched from. */
  target: HTMLElement;
  /** Returns the data that the page shows now. */
  getView: () => View;
  /** Runs the callback after the page renders the new data. Defaults to calling it right away. */
  afterRender?: (callback: () => void) => void;
}

/** What makes one kind of update event, such as `shopify:collection:update`. */
export interface UpdateEventsSpec<View, Payload, Result> {
  /** The name of the updates in log messages, such as `collection update`. */
  name: string;
  /** Returns the event class from the Standard Events module. */
  getEventClass: (
    module: typeof StandardEvents,
  ) => (new (payload: Payload & { promise: Promise<Result> }) => Event) | undefined;
  /** Returns the event payload, without the promise, for a change to `state`. */
  createPayload: (view: View, state: BrowseState) => Payload;
  /** Returns the value that resolves the promise when the store settles. */
  getResult: (view: View) => Result;
  /** Returns the key of the page. A new key rejects the pending promises. */
  getKey: (view: View) => string;
  /** The message of the `AbortError` that rejects the pending promises. */
  abortMessage: string;
}

/** The connection that a `connect*Updates` function returns. */
export interface UpdateEventsConnection {
  notify(): void;
  disconnect(): void;
}

type Update<Result> = {
  key: string;
  resolve: (result: Result) => void;
  reject: (reason: unknown) => void;
};

/**
 * Sends one update event for each `notify()` call that changes the filters or sort of the store.
 * The event's promise resolves with `getResult(getView())` when the store settles, and rejects
 * with an `AbortError` when the key changes, when the filters or sort change without `notify()`,
 * and on `disconnect()`.
 */
export function connectUpdateEvents<View, Payload, Result>(
  store: CollectionStore,
  options: UpdateEventsOptions<View>,
  spec: UpdateEventsSpec<View, Payload, Result>,
): UpdateEventsConnection {
  const { target, getView, afterRender = (callback) => callback() } = options;
  const { name, getEventClass, createPayload, getResult, getKey, abortMessage } = spec;
  // Analytics must never stop the navigation or the store updates.
  const guard = (run: () => void): void => {
    try {
      run();
    } catch (error) {
      log.error(`${name} failed`, { error });
    }
  };

  let connected = true;
  let loaded: typeof StandardEvents | undefined;
  let loadFailed = false;
  // The filters and sort of the last update, or of the last change without an update.
  let notified: BrowseState = store.getState();
  let checkScheduled = false;
  // Updates whose promise waits for the store to settle.
  let pending: Update<Result>[] = [];
  // Events that wait for the Standard Events module.
  let queue: { payload: Payload; promise: Promise<Result>; update: Update<Result> }[] = [];

  const remove = (update: Update<Result>) => {
    pending = pending.filter((candidate) => candidate !== update);
  };

  const abort = (updates: Update<Result>[]) => {
    pending = pending.filter((update) => !updates.includes(update));
    for (const update of updates) update.reject(new DOMException(abortMessage, "AbortError"));
  };

  const abortOtherKeys = () => {
    const key = getKey(getView());
    abort(pending.filter((update) => update.key !== key));
  };

  // A filter or sort change without `notify()`, such as back or forward navigation, leaves the
  // pending changes.
  const checkChangeWithoutNotify = () => {
    const state = store.getState();
    if (browseStateEqual(state, notified)) return;
    notified = state;
    abort(pending);
  };

  const resolvePending = () => {
    const updates = pending.slice();
    if (updates.length === 0) return;
    afterRender(() =>
      guard(() => {
        const view = getView();
        const key = getKey(view);
        const result = getResult(view);
        for (const update of updates) {
          if (!pending.includes(update)) continue;
          if (update.key !== key) {
            abort([update]);
            continue;
          }
          remove(update);
          update.resolve(result);
        }
      }),
    );
  };

  const dispatchQueued = () => {
    const EventClass = loaded && getEventClass(loaded);
    if (!EventClass) return;
    for (const { payload, promise, update } of queue.splice(0)) {
      try {
        target.dispatchEvent(new EventClass({ ...payload, promise }));
      } catch (error) {
        remove(update);
        update.reject(error);
        log.error(`${name} event failed`, { error });
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
      if (pending.length > 0) abortOtherKeys();
      if (!checkScheduled && !browseStateEqual(state, notified)) {
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
        if (browseStateEqual(state, notified)) return;
        notified = state;

        const view = getView();
        const payload = createPayload(view, state);

        // Not `Promise.withResolvers`, which older Safari versions don't have.
        let settlers: Pick<Update<Result>, "resolve" | "reject"> | undefined;
        const promise = new Promise<Result>((resolve, reject) => {
          settlers = { resolve, reject };
        });
        if (!settlers) return;
        const { resolve, reject } = settlers;
        // Listeners still see the rejection. The empty handler keeps an AbortError without
        // listeners from being reported as an unhandled rejection.
        promise.catch(() => {});
        const update: Update<Result> = { key: getKey(view), resolve, reject };
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
