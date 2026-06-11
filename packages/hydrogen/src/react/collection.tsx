import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type FormHTMLAttributes,
  type ReactNode,
  type SubmitEvent,
} from "react";

import {
  createCollectionStore,
  createCollectionReconciler,
  type CollectionData,
  type CollectionReconciler,
  type CollectionStore,
} from "../core/collection";
import type { CollectionState } from "../core/collection";

const CollectionContext = createContext<CollectionStore | null>(null);

/** Props for the {@link CollectionProvider} component. */
export interface CollectionProviderProps {
  /** Collection metadata from the framework data fetch (`handle`, `dataSearch`). */
  data: CollectionData;
  /**
   * Live URL search string from the framework router (with or without leading `?`).
   * Seeds the store on mount and keeps browse state in sync with back/forward.
   */
  urlSearch?: string;
  /**
   * Called after user-initiated filter/sort changes with a ready-to-use
   * search string. The consumer's only job is to navigate:
   *
   * ```tsx
   * onChange={(search) =>
   *   navigate({ search }, { replace: searchParams.size > 0, preventScrollReset: true })
   * }
   * ```
   */
  onChange?: (searchString: string) => void;
  children?: ReactNode;
}

/**
 * Manages the lifecycle of a {@link CollectionStore}: creates on mount and
 * syncs with URL changes. Recreates the store when `data.handle` changes
 * (navigating to a different collection).
 */
export function CollectionProvider({
  data,
  urlSearch = "",
  onChange,
  children,
}: CollectionProviderProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const urlSearchRef = useRef(urlSearch);
  urlSearchRef.current = urlSearch;

  const dataRef = useRef(data);
  dataRef.current = data;

  const { handle: collectionHandle, dataSearch } = data;

  const store = useMemo(
    () => createCollectionStore({ data, urlSearch }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- store recreated only when collection handle changes
    [data.handle],
  );

  const reconcilerRef = useRef<CollectionReconciler | null>(null);

  useLayoutEffect(() => {
    reconcilerRef.current = createCollectionReconciler(
      {
        getStore: () => store,
        readUrlSearch: () => urlSearchRef.current,
        emitChange: (s) => onChangeRef.current?.(s),
      },
      urlSearchRef.current,
    );
    store.setOnBrowseChange(() => reconcilerRef.current?.handleBrowseChange());
    return () => {
      store.setOnBrowseChange(null);
    };
  }, [store]);

  useLayoutEffect(() => {
    reconcilerRef.current?.reconcile(urlSearch, dataRef.current.dataSearch);
  }, [urlSearch, store, collectionHandle, dataSearch]);

  return createElement(CollectionContext.Provider, { value: store }, children);
}

function useRequiredStore(hookName: string): CollectionStore {
  const store = useContext(CollectionContext);
  if (!store) {
    throw new Error(`${hookName} must be used inside a <CollectionProvider>.`);
  }
  return store;
}

/**
 * Subscribes to the collection store and returns the full state snapshot.
 *
 * @example
 * ```tsx
 * const { status, filters } = useCollection();
 * ```
 */
export function useCollection(): CollectionState;
/**
 * Subscribes to the collection store and returns a derived value via `selector`.
 * Optionally accepts an `isEqual` comparator to skip re-renders when the
 * derived value is structurally unchanged.
 *
 * @example
 * ```tsx
 * const status = useCollection(s => s.status);
 * const filters = useCollection(s => s.filters, shallowEqual);
 * ```
 */
export function useCollection<S>(
  selector: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): S;
export function useCollection<S>(
  selector?: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): CollectionState | S {
  const store = useRequiredStore("useCollection");
  const cachedRef = useRef<{
    state: unknown;
    selector: typeof selector;
    value: CollectionState | S;
  } | null>(null);

  const getSnapshot = () => {
    const state = store.getState();

    if (
      cachedRef.current &&
      cachedRef.current.state === state &&
      cachedRef.current.selector === selector
    ) {
      return cachedRef.current.value;
    }

    if (!selector) {
      cachedRef.current = { state, selector, value: state };
      return state;
    }

    const next = selector(state);

    if (cachedRef.current && isEqual?.(cachedRef.current.value as S, next)) {
      cachedRef.current = { state, selector, value: cachedRef.current.value };
      return cachedRef.current.value;
    }

    cachedRef.current = { state, selector, value: next };
    return next;
  };

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** Mutation methods that update store state and trigger the `onChange` callback. */
export type CollectionActions = Pick<
  CollectionStore,
  | "setFilters"
  | "toggleFilter"
  | "toggleFilterInput"
  | "setSortKey"
  | "setSortByValue"
  | "reset"
  | "handleFormSubmit"
>;

/**
 * Returns methods that change filters and sort. The store's `onBrowseChange`
 * callback (set by {@link CollectionProvider}) handles calling `onChange` with
 * a serialized search string.
 */
export function useCollectionActions(): CollectionActions {
  const store = useRequiredStore("useCollectionActions");

  return useMemo(
    () => ({
      setFilters: store.setFilters,
      toggleFilter: store.toggleFilter,
      toggleFilterInput: store.toggleFilterInput,
      setSortKey: store.setSortKey,
      setSortByValue: store.setSortByValue,
      reset: store.reset,
      handleFormSubmit: store.handleFormSubmit,
    }),
    [store],
  );
}

/**
 * Returns form props for progressive-enhancement of collection filter forms.
 *
 * @example
 * ```tsx
 * const { formProps } = useCollectionForm();
 * return (
 *   <form {...formProps()} action="/collections/shoes">
 *     <input type="checkbox" name="filter.p.tag" value="sale" />
 *     <button type="submit">Apply</button>
 *   </form>
 * );
 * ```
 */
export function useCollectionForm() {
  const actions = useCollectionActions();

  const formProps = useCallback(
    (opts?: {
      beforeSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
      afterSubmit?: (e: SubmitEvent<HTMLFormElement>) => void;
    }): FormHTMLAttributes<HTMLFormElement> => ({
      onSubmit: (e: SubmitEvent<HTMLFormElement>) => {
        opts?.beforeSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        actions.handleFormSubmit(e.nativeEvent);
        opts?.afterSubmit?.(e);
      },
    }),
    [actions],
  );

  return { formProps };
}

export type { CollectionData };
