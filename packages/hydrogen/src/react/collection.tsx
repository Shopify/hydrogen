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
 * Props for CollectionProvider.
 */
export interface CollectionProviderProps {
  /** The collection handle and the search string that your loader fetched products for. */
  data: CollectionData;
  /**
   * Current URL search string from your router, with or without a leading `?`. Defaults to an empty string.
   * The provider reads the starting filters and sort from the string. When the string changes, including on back and forward navigation, the provider updates the filters and sort.
   */
  urlSearch?: string;
  /**
   * Receives the new search string after the customer changes filters or sort. Navigate to the search string with your router.
   *
   * The search string starts with `?`, or is empty when no params remain.
   */
  onChange?: (searchString: string) => void;
  /** Content that reads and changes collection state through the collection hooks. */
  children?: ReactNode;
}

/**
 * Shares the customer's filter and sort choices with the collection hooks and keeps the choices in sync with the URL.
 *
 * The provider sets the status back to `"idle"` when your loader data matches the URL. When the collection handle changes, such as on navigation to a different collection, the provider reads the filters and sort from the URL again.
 *
 * @param props - The collection data, the URL search string, the change callback, and the content that uses the collection hooks.
 * @returns A provider for the collection hooks.
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
 * Returns the customer's filter and sort choices and the loading status, and re-renders the component when the state changes. The hook throws outside CollectionProvider.
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
 * With a selector, the hook returns the selected value and re-renders the component when the selected value changes.
 * Pass an `isEqual` comparator to skip re-renders for equal values. The hook throws outside CollectionProvider.
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
 * Returns methods that change the filters and sort. After each change, CollectionProvider passes the new search string to its `onChange` callback.
 *
 * The hook throws outside CollectionProvider.
 *
 * @returns Methods that set, toggle, and reset filters, change the sort, and apply submitted filter forms.
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
 * Returns props that make a collection filter form update the results without a full page load.
 *
 * Spread the result of `formProps()` on the form. On submit, the props cancel the browser submission and apply the form's filter and sort fields.
 * The `beforeSubmit` callback runs first, and calling `preventDefault()` in `beforeSubmit` skips the update. The `afterSubmit` callback runs after the update.
 *
 * Render the form with `method="get"` and an explicit `action`, which keeps the form working before JavaScript loads. On search pages, keep `q` as a hidden input inside the form. The hook throws outside CollectionProvider.
 *
 * @returns An object with a `formProps` function. Call the function with optional `beforeSubmit` and `afterSubmit` callbacks, and spread the result on the form.
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
