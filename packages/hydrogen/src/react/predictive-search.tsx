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
 * Props for the predictive search provider.
 *
 * The provider connects the store on mount and destroys the store on unmount. A change to a store option prop replaces the store with a new one. The provider compares the types and searchable fields arrays by their values.
 *
 * The provider throws when neither the fetch prop nor a global fetch function exists.
 */
export type PredictiveSearchProviderProps = CreatePredictiveSearchStoreOptions & {
  /** Content that uses the predictive search hooks. */
  children?: ReactNode;
  /** Search page path for the form action. The form hook sets the path on the form, which keeps search working without JavaScript. Defaults to `"/search"`. */
  searchAction?: string;
};

export type { PredictiveSearchActions };

/**
 * Options for the form props function of the predictive search form hook.
 *
 * Accepts every standard form attribute. Attributes that you pass override the default action, method, and role.
 */
export type PredictiveSearchFormPropsOptions = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  /** Set to `true` to cancel the native submission and run a client-side search with the submitted term. */
  preventDefault?: boolean;
  /** Runs on submit with the submit event and the search term. Calling preventDefault on the event cancels the native submission and the client-side search. */
  onSubmit?: (event: SubmitEvent<HTMLFormElement>, term: string) => void;
};

/**
 * Options for the query input attributes that the register function returns.
 *
 * Accepts every standard input attribute except the attributes that the register function sets.
 */
export type PredictiveSearchQueryInputPropsOptions = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "autoCapitalize" | "autoComplete" | "name" | "onChange" | "spellCheck" | "type"
> & {
  /** Runs on change with the change event and the input value. Calling preventDefault on the event skips the automatic search. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, term: string) => void;
};

type PredictiveSearchFormField = Parameters<CorePredictiveSearchFormRegister>[0];

/** Returns the input attributes for a form field, merged with the options that you pass. */
export type PredictiveSearchFormRegister = (
  field: PredictiveSearchFormField,
  options?: PredictiveSearchQueryInputPropsOptions,
) => InputHTMLAttributes<HTMLInputElement>;

/** Functions that build a predictive search form that works without JavaScript. */
export type PredictiveSearchFormResult = {
  /**
   * Returns the form attributes, including the search action and a submit handler.
   *
   * By default, the form submits natively with the GET method to the provider's search action.
   * Pass `preventDefault: true` to cancel the native submission and search on the client.
   */
  formProps(options?: PredictiveSearchFormPropsOptions): FormHTMLAttributes<HTMLFormElement>;
  /**
   * Returns the query input attributes, including a change handler that searches on every change.
   *
   * The function accepts only the `query` field and throws for any other field name.
   */
  register: PredictiveSearchFormRegister;
};

/**
 * Creates a predictive search store and shares the store with the predictive search hooks inside the provider.
 *
 * The provider connects the store on mount and destroys the store on unmount. A change to a store option prop replaces the store with a new one.
 *
 * @param props - The store options, the search page path, and the content that uses the predictive search hooks.
 * @returns A context provider that shares the predictive search store and actions with its children.
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
 * Returns the predictive search state and re-renders the component when the state changes.
 *
 * With a selector, the hook returns the selected value and re-renders only when that value changes. To re-render on status changes only, pass a selector that returns the status.
 * The hook compares values by reference unless you pass an equality function.
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
 * @param selector - The function that derives the returned value from the predictive search state.
 * @param isEqual - The comparator that skips a re-render when it returns `true` for two derived values.
 * @returns The full predictive search state, or the value your selector derives from it.
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
 * Returns methods that search and clear results in the provider's current store.
 *
 * The methods keep the same identity across re-renders. After a store option prop change replaces the store, the methods act on the new store.
 *
 * @returns Search and clear methods bound to the provider's current store.
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export function usePredictiveSearchActions(): PredictiveSearchActions {
  return useRequiredContext("usePredictiveSearchActions").actions;
}

/**
 * Returns functions that build a predictive search form that works without JavaScript.
 *
 * The form props function returns the form attributes. The register function returns the query input attributes and searches on every change.
 * Both functions accept a callback that receives the event and the search term. Calling preventDefault on the event cancels the automatic behavior.
 *
 * @returns Functions that generate the search form's attributes and the query input's attributes.
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
 * Returns the predictive search state and re-renders the component when the state changes.
 *
 * With a selector, the hook returns the selected value and re-renders only when that value changes. To re-render on status changes only, pass a selector that returns the status.
 * The hook compares values by reference unless you pass an equality function.
 *
 * @throws {Error} When you call the hook outside a PredictiveSearchProvider.
 * @publicDocs
 */
export type UsePredictiveSearchForDocs =
  /**
   * @param selector - The function that derives the returned value from the predictive search state.
   * @param isEqual - The comparator that skips a re-render when it returns `true` for two derived values.
   * @returns The full predictive search state, or the value your selector derives from it.
   */
  <S = PredictiveSearchState>(
    selector?: (state: PredictiveSearchState) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => S;
