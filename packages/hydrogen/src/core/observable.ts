export interface Observable<T> {
  readonly state: T;
  subscribe(fn: (state: T) => void): () => void;
  subscribe<S>(
    fn: (slice: S) => void,
    selector: (state: T) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): () => void;
}

type InternalObservable<T> = Observable<T> & {
  setState(next: T | ((prev: T) => T)): void;
};

type Listener<T> = {
  fn: (value: unknown) => void;
  selector?: (state: T) => unknown;
  isEqual: (a: unknown, b: unknown) => boolean;
  prev: unknown;
};

export function createObservable<T>(initialState: T): InternalObservable<T> {
  let currentState = initialState;
  let listeners: Listener<T>[] = [];

  function setState(next: T | ((prev: T) => T)): void {
    const nextState = typeof next === "function" ? (next as (prev: T) => T)(currentState) : next;

    if (Object.is(currentState, nextState)) return;

    currentState = nextState;

    const snapshot = listeners.slice();
    for (const listener of snapshot) {
      if (!listeners.includes(listener)) continue;

      if (listener.selector) {
        const nextSlice = listener.selector(currentState);
        if (listener.isEqual(listener.prev, nextSlice)) continue;
        listener.prev = nextSlice;
        listener.fn(nextSlice);
      } else {
        listener.fn(currentState);
      }
    }
  }

  function subscribe(fn: (state: T) => void): () => void;
  function subscribe<S>(
    fn: (slice: S) => void,
    selector: (state: T) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): () => void;
  function subscribe<S>(
    fn: (value: T | S) => void,
    selector?: (state: T) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): () => void {
    const listener: Listener<T> = {
      fn: fn as (value: unknown) => void,
      selector,
      isEqual: (isEqual as ((a: unknown, b: unknown) => boolean) | undefined) ?? Object.is,
      prev: selector ? selector(currentState) : undefined,
    };

    listeners.push(listener);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  return {
    get state() {
      return currentState;
    },
    subscribe,
    setState,
  };
}
