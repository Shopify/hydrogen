import {
  createPredictiveSearchFormRegister,
  createPredictiveSearchStore,
  getPredictiveSearchFormAttributes,
  readPredictiveSearchFormTerm,
  type CreatePredictiveSearchStoreOptions,
  type PredictiveSearchData,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "@shopify/hydrogen";
import { inject, onScopeDispose, onUnmounted, provide, shallowRef, type Ref } from "vue";

const predictiveSearchStoreKey = Symbol("NuxtPredictiveSearchStore");

export type PredictiveSearchActions = Pick<PredictiveSearchStore, "search" | "clear">;

export type PredictiveSearchFormPropsOptions = {
  preventDefault?: boolean;
  onSubmit?: (event: SubmitEvent, term: string) => void;
  [key: string]: unknown;
};

export type PredictiveSearchQueryInputPropsOptions = {
  onInput?: (event: Event, term: string) => void;
  [key: string]: unknown;
};

export function providePredictiveSearchStore(
  options: CreatePredictiveSearchStoreOptions = {},
): PredictiveSearchStore {
  const store = createPredictiveSearchStore(options);
  provide(predictiveSearchStoreKey, store);

  onUnmounted(() => {
    store.destroy();
  });

  return store;
}

export function usePredictiveSearchStore(): PredictiveSearchStore {
  const store = inject<PredictiveSearchStore | null>(predictiveSearchStoreKey, null);
  if (!store)
    throw new Error("usePredictiveSearch must be used after providePredictiveSearchStore().");
  return store;
}

export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
>(): Readonly<Ref<PredictiveSearchState<TData>>>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(
  selector: (state: PredictiveSearchState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<S>>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(
  selector?: (state: PredictiveSearchState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<S | PredictiveSearchState<TData>>> {
  const store = usePredictiveSearchStore() as PredictiveSearchStore<TData>;
  const resolve = selector ?? ((state: PredictiveSearchState<TData>) => state as unknown as S);
  const selected = shallowRef<S | PredictiveSearchState<TData>>(resolve(store.getState()));

  const unsubscribe = store.subscribe(() => {
    const next = resolve(store.getState());
    if (selector && isEqual?.(selected.value as S, next)) return;
    selected.value = next;
  });

  onScopeDispose(unsubscribe);

  return selected as Readonly<Ref<S | PredictiveSearchState<TData>>>;
}

export function usePredictiveSearchActions(): PredictiveSearchActions {
  const store = usePredictiveSearchStore();

  return {
    search: (term) => store.search(term),
    clear: () => store.clear(),
  };
}

export function usePredictiveSearchForm() {
  const store = usePredictiveSearchStore();
  const registerFormField = createPredictiveSearchFormRegister();

  function register(
    field: "query",
    options: PredictiveSearchQueryInputPropsOptions = {},
  ): Record<string, unknown> {
    const { onInput, ...attributes } = options;
    const coreAttributes = registerFormField(field);

    return {
      ...attributes,
      ...coreAttributes,
      onInput: (event: Event) => {
        const term = (event.target as HTMLInputElement).value;
        onInput?.(event, term);
        if (event.defaultPrevented) return;
        void store.search(term);
      },
    };
  }

  function formProps(options: PredictiveSearchFormPropsOptions = {}): Record<string, unknown> {
    const { onSubmit, preventDefault, ...attributes } = options;

    return {
      ...getPredictiveSearchFormAttributes(),
      ...attributes,
      onSubmit: (event: SubmitEvent) => {
        const term = readPredictiveSearchFormTerm(
          new FormData(event.currentTarget as HTMLFormElement),
        );
        onSubmit?.(event, term);
        if (event.defaultPrevented) return;
        if (!preventDefault) return;
        event.preventDefault();
        void store.search(term);
      },
    };
  }

  return { formProps, register };
}
