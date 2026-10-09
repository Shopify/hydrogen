"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ChangeEvent,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SubmitEvent,
} from "react";

import {
  createPredictiveSearchFormRegister,
  createPredictiveSearchStore,
  getPredictiveSearchFormAttributes,
  readPredictiveSearchFormTerm,
  type CreatePredictiveSearchStoreOptions,
  type PredictiveSearchActions,
  type PredictiveSearchFormRegister as CorePredictiveSearchFormRegister,
  type PredictiveSearchData,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "../core/predictive-search";

const CONFIG_ARRAY_SEPARATOR = "\u0000";

type PredictiveSearchContextValue = {
  store: PredictiveSearchStore;
  actions: PredictiveSearchActions;
  searchAction?: string;
};

const PredictiveSearchContext = createContext<PredictiveSearchContextValue | null>(null);

/**
 * Store options, the search page path, and the content that uses the predictive search hooks.
 *
 * Changing a store option clears the current term and results. The provider compares `types` and `searchableFields` by value, which lets you pass new arrays on each render.
 */
export interface PredictiveSearchProviderProps extends CreatePredictiveSearchStoreOptions {
  /** Content that uses the predictive search hooks. */
  children?: ReactNode;
  /** Search page path that forms from `usePredictiveSearchForm` submit to. Defaults to `/search`. */
  searchAction?: string;
}

export type { PredictiveSearchActions };

/** Submit behavior for the search form. */
interface PredictiveSearchFormSubmitOptions {
  /** Pass `true` to run the search in the browser on submit and stay on the current page. Defaults to `false`. */
  preventDefault?: boolean;
  /** Runs on submit with the event and the search term. Call `event.preventDefault()` to cancel both the page navigation and the browser search. */
  onSubmit?: (event: SubmitEvent<HTMLFormElement>, term: string) => void;
}

/**
 * Form attributes and submit behavior for the search form.
 *
 * Any standard form attribute works. Attributes that you pass override the default action, method, and role.
 */
export type PredictiveSearchFormPropsOptions = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> &
  PredictiveSearchFormSubmitOptions;

/**
 * Input attributes and a change callback for the search input.
 *
 * Any standard input attribute works except the name, type, autocomplete, autocapitalize, and spell check attributes, which the register function sets.
 */
export type PredictiveSearchQueryInputPropsOptions = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "autoCapitalize" | "autoComplete" | "name" | "onChange" | "spellCheck" | "type"
> &
  PredictiveSearchQueryInputChangeOptions;

/** Change behavior for the search input. */
interface PredictiveSearchQueryInputChangeOptions {
  /** Runs on every change with the event and the input value. Call `event.preventDefault()` to skip the search for that change. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, term: string) => void;
}

type PredictiveSearchFormField = Parameters<CorePredictiveSearchFormRegister>[0];

/** Returns the search input attributes, merged with the attributes that you pass. */
export type PredictiveSearchFormRegister = (
  field: PredictiveSearchFormField,
  options?: PredictiveSearchQueryInputPropsOptions,
) => InputHTMLAttributes<HTMLInputElement>;

/** Functions that return attributes for a predictive search form and its search input. */
export type PredictiveSearchFormResult = {
  /**
   * Returns the attributes for the search form.
   *
   * By default, submitting the form opens the search page at the provider's search action.
   * Pass `preventDefault: true` to run the search in the browser and stay on the current page.
   */
  formProps(options?: PredictiveSearchFormPropsOptions): FormHTMLAttributes<HTMLFormElement>;
  /**
   * Returns the attributes for the search input, which searches as the customer types.
   *
   * Pass `query`. Any other field name throws an error.
   */
  register: PredictiveSearchFormRegister;
};

/**
 * Runs predictive search for the components inside the provider. Wrap your search UI in the provider. Inside the provider, `usePredictiveSearch` reads the results, `usePredictiveSearchActions` searches and clears, and `usePredictiveSearchForm` builds the search form.
 *
 * The provider throws an error when you omit the `fetch` prop in a runtime without a global `fetch`.
 *
 * @param props - The store options, the search page path, and the content that uses the predictive search hooks.
 * @returns The provider element that wraps your search UI.
 * @throws {Error} When neither the fetch prop nor a global fetch function exists.
 * @publicDocs
 */
export function PredictiveSearchProvider({
  children,
  predictiveSearchEndpoint,
  searchAction,
  debounceInMs,
  minTermLength,
  fetch,
  limit,
  limitScope,
  types,
  searchableFields,
  unavailableProducts,
}: PredictiveSearchProviderProps) {
  const typesKey = getArrayKey(types);
  const searchableFieldsKey = getArrayKey(searchableFields);

  const store = useMemo(
    () =>
      createPredictiveSearchStore({
        predictiveSearchEndpoint,
        debounceInMs,
        minTermLength,
        fetch,
        limit,
        limitScope,
        types,
        searchableFields,
        unavailableProducts,
      }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- array keys are the semantic dependencies
    [
      predictiveSearchEndpoint,
      debounceInMs,
      minTermLength,
      fetch,
      limit,
      limitScope,
      typesKey,
      searchableFieldsKey,
      unavailableProducts,
    ],
  );

  const storeRef = useRef(store);
  // Actions outlive store swaps by reading the committed store at call time. Only an insertion
  // effect is both commit-only and early enough: a render-phase write can point actions at a
  // store from a render React never commits, and layout and passive effects run child-first,
  // so a child effect searching in the same commit would still see the old store.
  useInsertionEffect(() => {
    storeRef.current = store;
  }, [store]);
  const actions = useMemo<PredictiveSearchActions>(
    () => ({
      search: (term) => storeRef.current.search(term),
      clear: () => storeRef.current.clear(),
    }),
    [],
  );

  useEffect(() => {
    store.connect();
    return () => store.destroy();
  }, [store]);

  const contextValue = useMemo(
    () => ({ store, actions, searchAction }),
    [store, actions, searchAction],
  );

  return createElement(PredictiveSearchContext.Provider, { value: contextValue }, children);
}

function getArrayKey(values: readonly string[] | undefined): string {
  return values?.join(CONFIG_ARRAY_SEPARATOR) ?? "";
}

function useRequiredStore<TData extends PredictiveSearchData>(
  hookName: string,
): PredictiveSearchStore<TData> {
  const context = useContext(PredictiveSearchContext);
  if (!context) {
    throw new Error(`${hookName} must be used inside a <PredictiveSearchProvider>.`);
  }

  // oxlint-disable-next-line @typescript-eslint/consistent-type-assertions -- context stores the runtime object while hooks preserve caller-provided result typing
  return context.store as PredictiveSearchStore<TData>;
}

function useRequiredContext(hookName: string): PredictiveSearchContextValue {
  const context = useContext(PredictiveSearchContext);
  if (!context) {
    throw new Error(`${hookName} must be used inside a <PredictiveSearchProvider>.`);
  }

  return context;
}

/**
 * Returns the search term, status, results, and error, and re-renders the component on each change.
 *
 * Pass a selector to read one value, such as the status, and re-render only when that value changes. The hook compares selected values by reference unless you pass an equality function.
 * The hook throws an error outside a `PredictiveSearchProvider`.
 *
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
>(): PredictiveSearchState<TData>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(selector: (state: PredictiveSearchState<TData>) => S, isEqual?: (a: S, b: S) => boolean): S;
/**
 * @param selector - Function that picks the value to return from the search state.
 * @param isEqual - Function that compares two selected values. Return `true` to skip the re-render.
 * @returns The search state, or the value that your selector picks.
 */
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(
  selector?: (state: PredictiveSearchState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): PredictiveSearchState<TData> | S {
  const store = useRequiredStore<TData>("usePredictiveSearch");
  const cachedRef = useRef<{
    state: unknown;
    selector: typeof selector;
    value: PredictiveSearchState<TData> | S;
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
 * Returns methods that search for a term and clear the results of the provider's predictive search. Use the hook in components that start searches without reading results.
 *
 * The methods keep the same identity across re-renders and keep working after a store option changes.
 * The hook throws an error outside a `PredictiveSearchProvider`.
 *
 * @returns Methods that search for a term and clear the results.
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export function usePredictiveSearchActions(): PredictiveSearchActions {
  return useRequiredContext("usePredictiveSearchActions").actions;
}

/**
 * Returns functions that connect a search form and its search input to the provider's predictive search. The form submits to the search page without JavaScript, and the search input searches as the customer types.
 *
 * Spread `formProps()` on the form and `register("query")` on the input. In the `onSubmit` and `onChange` callbacks, call `event.preventDefault()` to skip the automatic submission or search.
 * The hook throws an error outside a `PredictiveSearchProvider`.
 *
 * @returns Functions that return the search form attributes and the search input attributes.
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export function usePredictiveSearchForm(): PredictiveSearchFormResult {
  const { searchAction, actions } = useRequiredContext("usePredictiveSearchForm");
  const coreRegister = useMemo(() => createPredictiveSearchFormRegister(), []);

  const register = useCallback<PredictiveSearchFormRegister>(
    (field, props = {}) => {
      const { onChange, ...attributes } = props;
      const coreAttributes = coreRegister(field);

      return {
        ...attributes,
        ...coreAttributes,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const term = event.currentTarget.value;
          onChange?.(event, term);
          if (event.defaultPrevented) return;
          void actions.search(term);
        },
      };
    },
    [coreRegister, actions],
  );

  const formProps = useCallback(
    (props: PredictiveSearchFormPropsOptions = {}): FormHTMLAttributes<HTMLFormElement> => {
      const { onSubmit, preventDefault, ...attributes } = props;

      return {
        ...getPredictiveSearchFormAttributes(searchAction),
        ...attributes,
        onSubmit: (event: SubmitEvent<HTMLFormElement>) => {
          const term = readPredictiveSearchFormTerm(new FormData(event.currentTarget));
          onSubmit?.(event, term);
          if (event.defaultPrevented) return;
          if (!preventDefault) return;
          event.preventDefault();
          void actions.search(term);
        },
      };
    },
    [searchAction, actions],
  );

  return { formProps, register };
}

/**
 * Returns the search term, status, results, and error, and re-renders the component on each change.
 *
 * Pass a selector to read one value, such as the status, and re-render only when that value changes. The hook compares selected values by reference unless you pass an equality function.
 * The hook throws an error outside a `PredictiveSearchProvider`.
 *
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export type UsePredictiveSearchForDocs =
  /**
   * @param selector - Function that picks the value to return from the search state.
   * @param isEqual - Function that compares two selected values. Return `true` to skip the re-render.
   * @returns The search state, or the value that your selector picks.
   */
  <S = PredictiveSearchState>(
    selector?: (state: PredictiveSearchState) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => S;
