"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
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
  type PredictiveSearchFormRegister as CorePredictiveSearchFormRegister,
  type PredictiveSearchData,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "../core/predictive-search";

const CONFIG_ARRAY_SEPARATOR = "\u0000";

type PredictiveSearchContextValue = {
  store: PredictiveSearchStore;
  searchAction?: string;
};

const PredictiveSearchContext = createContext<PredictiveSearchContextValue | null>(null);

/** Props for the {@link PredictiveSearchProvider} component. */
export type PredictiveSearchProviderProps = CreatePredictiveSearchStoreOptions & {
  children?: ReactNode;
  /** Form action URL for progressive enhancement. Used by {@link usePredictiveSearchForm} to set the form's `action` attribute so the search works without JavaScript. Falls back to `"/search"` when omitted. */
  searchAction?: string;
};

/** Stable action methods from the predictive search store, returned by {@link usePredictiveSearchActions}. */
export type PredictiveSearchActions = Pick<PredictiveSearchStore, "search" | "clear">;

/**
 * Options for the form props builder returned by {@link usePredictiveSearchForm}.
 *
 * Accepts all standard form HTML attributes except `onSubmit`, which is
 * replaced by a version that provides the extracted search term.
 */
export type PredictiveSearchFormPropsOptions = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  /** When `true`, prevents the native form submission and triggers a client-side search instead. */
  preventDefault?: boolean;
  /** Called on submit with the submit event and the extracted search term. Call `event.preventDefault()` to stop the client-side search. */
  onSubmit?: (event: SubmitEvent<HTMLFormElement>, term: string) => void;
};

/**
 * Options for the query input props builder returned by
 * {@link usePredictiveSearchForm}'s `register` method.
 *
 * Accepts all standard input HTML attributes except those controlled by the
 * form registration (`name`, `type`, `autoComplete`, `autoCapitalize`,
 * `spellCheck`, `onChange`).
 */
export type PredictiveSearchQueryInputPropsOptions = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "autoCapitalize" | "autoComplete" | "name" | "onChange" | "spellCheck" | "type"
> & {
  /** Called on change with the change event and the current input value. Call `event.preventDefault()` to skip the automatic search trigger. */
  onChange?: (event: ChangeEvent<HTMLInputElement>, term: string) => void;
};

type PredictiveSearchFormField = Parameters<CorePredictiveSearchFormRegister>[0];

/** Generates input element attributes for a named form field. Currently supports only `"query"`. */
export type PredictiveSearchFormRegister = (
  field: PredictiveSearchFormField,
  options?: PredictiveSearchQueryInputPropsOptions,
) => InputHTMLAttributes<HTMLInputElement>;

/** Return type of {@link usePredictiveSearchForm}, providing methods to build a progressively-enhanced search form. */
export type PredictiveSearchFormResult = {
  /** Generates form element attributes including the search action and submit handler. */
  formProps(options?: PredictiveSearchFormPropsOptions): FormHTMLAttributes<HTMLFormElement>;
  /** Generates input element attributes for a named form field and wires up the search trigger. */
  register: PredictiveSearchFormRegister;
};

/**
 * Creates and manages a predictive search store, providing it to descendant
 * hooks via React context.
 *
 * Recreates the store when configuration props change. Connects the store
 * on mount and destroys it on unmount.
 *
 * @throws {Error} When no `fetch` implementation is available (neither passed as a prop nor available on `globalThis`).
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

  useEffect(() => {
    store.connect();
    return () => store.destroy();
  }, [store]);

  const contextValue = useMemo(() => ({ store, searchAction }), [store, searchAction]);

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
 * Subscribes to the predictive search store's state.
 *
 * Without arguments, returns the full {@link PredictiveSearchState}. With a
 * `selector`, returns a derived value that only triggers re-renders when the
 * selected value changes (reference equality by default, or a custom
 * `isEqual`).
 *
 * Must be used inside a {@link PredictiveSearchProvider}.
 *
 * @throws {Error} When called outside a PredictiveSearchProvider.
 */
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
>(): PredictiveSearchState<TData>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(selector: (state: PredictiveSearchState<TData>) => S, isEqual?: (a: S, b: S) => boolean): S;
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
 * Returns stable `search` and `clear` methods from the predictive search
 * store. These references do not change across re-renders.
 *
 * Must be used inside a {@link PredictiveSearchProvider}.
 *
 * @throws {Error} When called outside a PredictiveSearchProvider.
 */
export function usePredictiveSearchActions(): PredictiveSearchActions {
  const store = useRequiredStore("usePredictiveSearchActions");

  return useMemo(
    () => ({
      search: store.search,
      clear: store.clear,
    }),
    [store],
  );
}

/**
 * Returns `formProps` and `register` for building a progressively-enhanced
 * search form.
 *
 * `formProps()` generates form element attributes including the search
 * action URL. `register("query")` generates input attributes and triggers
 * a search on every keystroke (debounced by the store). Both support an optional callback
 * that receives the event and extracted term, and respect
 * `event.preventDefault()` to cancel the automatic behavior.
 *
 * Must be used inside a {@link PredictiveSearchProvider}.
 *
 * @throws {Error} When called outside a PredictiveSearchProvider.
 */
export function usePredictiveSearchForm(): PredictiveSearchFormResult {
  const { searchAction, store } = useRequiredContext("usePredictiveSearchForm");
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
          void store.search(term);
        },
      };
    },
    [coreRegister, store],
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
          void store.search(term);
        },
      };
    },
    [searchAction, store],
  );

  return { formProps, register };
}
