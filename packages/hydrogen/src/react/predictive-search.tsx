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

export type PredictiveSearchProviderProps = CreatePredictiveSearchStoreOptions & {
  children?: ReactNode;
  searchAction?: string;
};

export type PredictiveSearchActions = Pick<PredictiveSearchStore, "search" | "clear">;

export type PredictiveSearchFormPropsOptions = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
> & {
  preventDefault?: boolean;
  onSubmit?: (event: SubmitEvent<HTMLFormElement>, term: string) => void;
};

export type PredictiveSearchQueryInputPropsOptions = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "autoCapitalize" | "autoComplete" | "name" | "onChange" | "spellCheck" | "type"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>, term: string) => void;
};

type PredictiveSearchFormField = Parameters<CorePredictiveSearchFormRegister>[0];

export type PredictiveSearchFormRegister = (
  field: PredictiveSearchFormField,
  options?: PredictiveSearchQueryInputPropsOptions,
) => InputHTMLAttributes<HTMLInputElement>;

export type PredictiveSearchFormResult = {
  formProps(options?: PredictiveSearchFormPropsOptions): FormHTMLAttributes<HTMLFormElement>;
  register: PredictiveSearchFormRegister;
};

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

  useEffect(() => () => store.destroy(), [store]);

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
