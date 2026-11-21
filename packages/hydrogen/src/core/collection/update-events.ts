import type * as StandardEvents from "../../../vendor/standard-events";
import { importStandardEventsFromCDN } from "../shopify-scripts/standard-events";
import type { CollectionUpdateSource } from "./collection-update";
import type { CollectionState } from "./state";
import { filtersEqual } from "./url";

/** @internal */
export type UpdateEventConnection<TView> = {
  /**
   * Call after each render with the rendered view. When the store is idle, pending update promises
   * resolve with the view's result. A view with a new key rejects them with an `AbortError`.
   */
  update(view: TView): void;
  /** Stops the events and rejects pending update promises with an `AbortError`. */
  disconnect(): void;
};

type UpdateEventClass<TPayload, TResult> = {
  createPromise(): {
    promise: Promise<TResult>;
    resolve(value: TResult): void;
    reject(reason?: unknown): void;
  };
  new (payload: TPayload & { promise: Promise<TResult> }): Event;
};

/** @internal */
export type UpdateEventOptions<TView, TPayload, TResult> = {
  getEventClass(module: typeof StandardEvents): UpdateEventClass<TPayload, TResult>;
  /** Builds the payload from the view before the change and the store state after the change. */
  createPayload(view: TView, state: CollectionState): TPayload;
  getResult(view: TView): TResult;
  /** Identifies the results that the view shows. Pending updates reject when the key changes. */
  getKey(view: TView): string;
  abortMessage: string;
};

type Settlers<TResult> = {
  resolve(value: TResult): void;
  reject(reason?: unknown): void;
};

/**
 * Sends an update event from the element for each customer filter or sort change in the source's
 * store. Each event's promise resolves with the result of the first render after the store settles.
 *
 * @internal
 */
export function connectUpdateEvents<TView, TPayload, TResult>(
  source: CollectionUpdateSource,
  element: HTMLElement,
  initialView: TView,
  options: UpdateEventOptions<TView, TPayload, TResult>,
): UpdateEventConnection<TView> {
  let view = initialView;
  let module: typeof StandardEvents | undefined;
  let connected = true;
  let pending: Settlers<TResult>[] = [];
  // Result of the latest render with an idle store, for events that send after the module loads.
  let settledResult: TResult | undefined;
  let previous = source.store.getState();
  let current = previous;

  const loading = importStandardEventsFromCDN().then(
    (loaded) => {
      module = loaded;
    },
    () => {},
  );

  const settle = (result: TResult) => {
    for (const { resolve } of pending) resolve(result);
    pending = [];
  };

  const abort = () => {
    for (const { reject } of pending) reject(new DOMException(options.abortMessage, "AbortError"));
    pending = [];
  };

  const dispatch = (payload: TPayload) => {
    if (!connected || !module) return;
    const EventClass = options.getEventClass(module);
    const { promise, resolve, reject } = EventClass.createPromise();
    // Listeners still see the rejection. The empty handler keeps an AbortError without listeners
    // from being reported as an unhandled rejection.
    promise.catch(() => {});
    pending.push({ resolve, reject });
    element.dispatchEvent(new EventClass({ ...payload, promise }));
    if (settledResult !== undefined) settle(settledResult);
  };

  const unsubscribeStore = source.store.subscribe((state) => {
    previous = current;
    current = state;
  });

  const unsubscribeSource = source.subscribe(() => {
    if (sameBrowseState(previous, current)) return;
    settledResult = undefined;
    const payload = options.createPayload(view, current);
    if (module) dispatch(payload);
    else void loading.then(() => dispatch(payload));
  });

  return {
    update(nextView) {
      // Updates for the previous results never finish when the results change.
      if (options.getKey(nextView) !== options.getKey(view)) abort();
      view = nextView;
      settledResult =
        source.store.getState().status === "idle" ? options.getResult(nextView) : undefined;
      if (settledResult !== undefined) settle(settledResult);
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
