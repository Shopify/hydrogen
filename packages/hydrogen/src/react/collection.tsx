"use client";

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
  type CollectionActions,
  type CollectionData,
  type CollectionReconciler,
  type CollectionStore,
} from "../core/collection";
import type { CollectionState } from "../core/collection";

const CollectionContext = createContext<CollectionStore | null>(null);

/**
 * Props for the collection provider. The provider creates a collection store and keeps its filters and sort in sync with the URL.
 */
export interface CollectionProviderProps {
  /** Collection handle and the search string your loader fetched the collection for. */
  data: CollectionData;
  /**
   * Current URL search string from your router, with or without a leading `?`. Defaults to an empty string.
   * The provider reads the initial filters and sort from the string on mount. When the string changes, including on back and forward navigation, the provider updates the store.
   */
  urlSearch?: string;
  /**
   * Receives the search string after a customer changes filters or sort. Navigate to the search string with your router.
   *
   * The search string starts with `?`, or is empty when no parameters remain.
   */
  onChange?: (searchString: string) => void;
  /** Content that reads and changes collection state through the collection hooks. */
  children?: ReactNode;
}

/**
 * Creates a collection store and keeps its filters and sort in sync with the URL.
 * The provider creates a new store when the collection handle changes, such as on navigation to a different collection.
 *
 * @param props - The collection data, the URL search string, the change callback, and the content that uses the collection hooks.
 * @returns A context provider that shares the collection store with its children.
 * @publicDocs
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
 * Returns the collection state and re-renders the component when the state changes.
 *
 * @returns The current collection state.
 *
 * @example
 * ```tsx
 * const { status, filters } = useCollection();
 * ```
 * @publicDocs
 */
export function useCollection(): CollectionState;
/**
 * With a selector, the hook returns the selector's value and re-renders the component when that value changes.
 * Pass an `isEqual` comparator to skip re-renders for equal values. The hook throws outside the collection provider.
 *
 * @returns The value your selector derives from the current collection state.
 *
 * @example
 * ```tsx
 * const status = useCollection(s => s.status);
 * const filters = useCollection(s => s.filters, shallowEqual);
 * ```
 * @publicDocs
 */
export function useCollection<S>(
  selector: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): S;
/**
 * @param selector The function that derives the returned value from the collection state.
 * @param isEqual The comparator that skips a re-render when it returns `true` for two derived values.
 * @returns The collection state, or the selector's value when you pass a selector.
 */
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

/**
 * Returns methods that change filters and sort. After each change, the collection provider passes the new search string to its `onChange` callback.
 *
 * The hook throws outside the collection provider.
 *
 * @returns Methods that set, toggle, and reset filters, set the sort, and apply submitted filter forms.
 *
 * @publicDocs
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
 * Returns form props that progressively enhance collection filter forms.
 *
 * Spread the result of `formProps()` on the form. Its submit handler cancels the native submission and applies the form's filter and sort fields to the store.
 * The handler runs `beforeSubmit` first and skips the store update when that callback prevents the default action. The handler runs `afterSubmit` after the store update.
 *
 * Render the form with `method="get"` and an explicit `action`. On search pages, keep `q` as a hidden input inside the form. The hook throws outside the collection provider.
 *
 * @returns An object with a `formProps` function. The function takes optional `beforeSubmit` and `afterSubmit` callbacks and returns form props that hold the form's submit handler.
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
 * @publicDocs
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

export type { CollectionActions, CollectionData };
