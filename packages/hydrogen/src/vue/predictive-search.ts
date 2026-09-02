import {
  defineComponent,
  inject,
  onMounted,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from "vue";

import {
  createPredictiveSearchFormRegister,
  createPredictiveSearchStore,
  getPredictiveSearchFormAttributes,
  readPredictiveSearchFormTerm,
  type CreatePredictiveSearchStoreOptions,
  type PredictiveSearchData,
  type PredictiveSearchState,
  type PredictiveSearchStore,
} from "../core/predictive-search";
import type {
  PredictiveSearchLimitScope,
  PredictiveSearchType,
  SearchableField,
  SearchUnavailableProductsType,
} from "../graphql/generated/storefront-api-types";

const CONFIG_ARRAY_SEPARATOR = "\0";

type PredictiveSearchContextValue = {
  storeRef: ShallowRef<PredictiveSearchStore>;
  searchActionRef: ShallowRef<string | undefined>;
};

const PredictiveSearchKey: InjectionKey<PredictiveSearchContextValue> = Symbol("PredictiveSearch");

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

export type PredictiveSearchFormResult = {
  formProps(options?: PredictiveSearchFormPropsOptions): Record<string, unknown>;
  register: (
    field: "query",
    options?: PredictiveSearchQueryInputPropsOptions,
  ) => Record<string, unknown>;
};

export const PredictiveSearchProvider = defineComponent({
  name: "PredictiveSearchProvider",
  props: {
    predictiveSearchEndpoint: { type: String, default: undefined },
    searchAction: { type: String, default: undefined },
    debounceInMs: { type: Number, default: undefined },
    minTermLength: { type: Number, default: undefined },
    fetch: { type: Function as PropType<typeof globalThis.fetch>, default: undefined },
    limit: { type: Number, default: undefined },
    limitScope: { type: String as PropType<PredictiveSearchLimitScope>, default: undefined },
    types: { type: Array as PropType<PredictiveSearchType[]>, default: undefined },
    searchableFields: { type: Array as PropType<SearchableField[]>, default: undefined },
    unavailableProducts: {
      type: String as PropType<SearchUnavailableProductsType>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    function buildStoreOptions(): CreatePredictiveSearchStoreOptions {
      return {
        predictiveSearchEndpoint: props.predictiveSearchEndpoint,
        debounceInMs: props.debounceInMs,
        minTermLength: props.minTermLength,
        fetch: props.fetch as typeof globalThis.fetch | undefined,
        limit: props.limit,
        limitScope: props.limitScope,
        types: props.types,
        searchableFields: props.searchableFields,
        unavailableProducts: props.unavailableProducts,
      };
    }

    const storeRef = shallowRef<PredictiveSearchStore>(
      createPredictiveSearchStore(buildStoreOptions()),
    );
    const searchActionRef = shallowRef(props.searchAction);

    provide(PredictiveSearchKey, { storeRef, searchActionRef });

    watch(
      () => props.searchAction,
      (next) => {
        searchActionRef.value = next;
      },
    );

    watch(
      () => [
        props.predictiveSearchEndpoint,
        props.debounceInMs,
        props.minTermLength,
        props.fetch,
        props.limit,
        props.limitScope,
        getArrayKey(props.types),
        getArrayKey(props.searchableFields),
        props.unavailableProducts,
      ],
      () => {
        storeRef.value.destroy();
        storeRef.value = createPredictiveSearchStore(buildStoreOptions());
        storeRef.value.connect();
      },
    );

    onMounted(() => {
      storeRef.value.connect();
    });

    onUnmounted(() => {
      storeRef.value.destroy();
    });

    return () => slots.default?.();
  },
});

function getArrayKey(values: readonly string[] | undefined): string {
  return values?.join(CONFIG_ARRAY_SEPARATOR) ?? "";
}

function useRequiredContext(composableName: string): PredictiveSearchContextValue {
  const context = inject(PredictiveSearchKey, null);
  if (!context) {
    throw new Error(`${composableName} must be used inside a <PredictiveSearchProvider>.`);
  }
  return context;
}

export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
>(): Readonly<ShallowRef<PredictiveSearchState<TData>>>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(
  selector: (state: PredictiveSearchState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S>>;
export function usePredictiveSearch<
  TData extends PredictiveSearchData = PredictiveSearchData,
  S = PredictiveSearchState<TData>,
>(
  selector?: (state: PredictiveSearchState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<PredictiveSearchState<TData> | S>> {
  const { storeRef } = useRequiredContext("usePredictiveSearch");
  const resolve = selector ?? ((state: PredictiveSearchState<TData>) => state as unknown as S);
  const selected = shallowRef<PredictiveSearchState<TData> | S>(
    resolve((storeRef.value as PredictiveSearchStore<TData>).getState()),
  );

  watch(
    () => storeRef.value,
    (store, _, onCleanup) => {
      const typedStore = store as PredictiveSearchStore<TData>;
      selected.value = resolve(typedStore.getState());

      const unsubscribe = typedStore.subscribe(() => {
        const next = resolve(typedStore.getState());
        if (isEqual && selector) {
          if (isEqual(selected.value as S, next)) return;
        }
        selected.value = next;
      });

      onCleanup(unsubscribe);
    },
    { immediate: true },
  );

  return selected as Readonly<ShallowRef<PredictiveSearchState<TData> | S>>;
}

export function usePredictiveSearchActions(): PredictiveSearchActions {
  const { storeRef } = useRequiredContext("usePredictiveSearchActions");

  return {
    search: (term) => storeRef.value.search(term),
    clear: () => storeRef.value.clear(),
  };
}

export function usePredictiveSearchForm(): PredictiveSearchFormResult {
  const { storeRef, searchActionRef } = useRequiredContext("usePredictiveSearchForm");
  const coreRegister = createPredictiveSearchFormRegister();

  function register(
    field: "query",
    options: PredictiveSearchQueryInputPropsOptions = {},
  ): Record<string, unknown> {
    const { onInput, ...attributes } = options;
    const coreAttributes = coreRegister(field);

    return {
      ...attributes,
      ...coreAttributes,
      onInput: (event: Event) => {
        const term = (event.target as HTMLInputElement).value;
        onInput?.(event, term);
        if (event.defaultPrevented) return;
        void storeRef.value.search(term);
      },
    };
  }

  function formProps(options: PredictiveSearchFormPropsOptions = {}): Record<string, unknown> {
    const { onSubmit, preventDefault, ...attributes } = options;

    return {
      ...getPredictiveSearchFormAttributes(searchActionRef.value),
      ...attributes,
      onSubmit: (event: SubmitEvent) => {
        const term = readPredictiveSearchFormTerm(
          new FormData(event.currentTarget as HTMLFormElement),
        );
        onSubmit?.(event, term);
        if (event.defaultPrevented) return;
        if (!preventDefault) return;
        event.preventDefault();
        void storeRef.value.search(term);
      },
    };
  }

  return { formProps, register };
}
