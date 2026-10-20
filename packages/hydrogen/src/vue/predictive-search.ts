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
  type PredictiveSearchActions,
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

export type { PredictiveSearchActions };

/**
 * Options for the form props function of the predictive search form composable.
 *
 * Accepts any form attribute. Attributes that you pass override the default action, method, and role.
 */
export type PredictiveSearchFormPropsOptions = {
  /** Set to `true` to cancel the native submission and run a client-side search with the submitted term. */
  preventDefault?: boolean;
  /** Runs on submit with the submit event and the search term. Calling preventDefault on the event cancels the native submission and the client-side search. */
  onSubmit?: (event: SubmitEvent, term: string) => void;
  [key: string]: unknown;
};

/** Options for the query input attributes that the register function returns. */
export type PredictiveSearchQueryInputPropsOptions = {
  /** Runs on input with the input event and the input value. Calling preventDefault on the event skips the automatic search. */
  onInput?: (event: Event, term: string) => void;
  [key: string]: unknown;
};

/** Functions that build a predictive search form that works without JavaScript. */
export type PredictiveSearchFormResult = {
  /** Returns the form attributes, including the search action and a submit handler. */
  formProps(options?: PredictiveSearchFormPropsOptions): Record<string, unknown>;
  /** Returns the query input attributes, including an input handler that searches on every input event. The function accepts only the `query` field and throws for any other field name. */
  register: (
    field: "query",
    options?: PredictiveSearchQueryInputPropsOptions,
  ) => Record<string, unknown>;
};

/**
 * Creates a predictive search store and shares the store with the predictive search composables in the default slot.
 *
 * The provider connects the store on mount and destroys the store on unmount. A change to a store option prop replaces the store with a new one. The provider compares the types and searchable fields arrays by their values.
 *
 * The provider throws when neither the fetch prop nor a global fetch function exists.
 *
 * @throws {Error} When neither the fetch prop nor a global fetch function exists.
 * @publicDocs
 */
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

/**
 * Returns the predictive search state as a read-only shallow ref that updates when the state changes.
 *
 * With a selector, the ref holds the selected value and updates only when that value changes.
 * The composable compares values by reference unless you pass an equality function.
 *
 * @throws {Error} When you call it outside a PredictiveSearchProvider.
 * @publicDocs
 */
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

/**
 * Returns methods that search and clear results in the provider's current store.
 *
 * After a store option prop change replaces the store, the methods act on the new store.
 *
 * @throws {Error} When you call it outside a PredictiveSearchProvider.
 * @publicDocs
 */
export function usePredictiveSearchActions(): PredictiveSearchActions {
  const { storeRef } = useRequiredContext("usePredictiveSearchActions");

  return {
    search: (term) => storeRef.value.search(term),
    clear: () => storeRef.value.clear(),
  };
}

/**
 * Returns functions that build a predictive search form that works without JavaScript.
 *
 * The form props function returns the form attributes. The register function returns the query input attributes and searches on every input event.
 * Both functions accept a callback that receives the event and the search term. Calling preventDefault on the event cancels the automatic behavior.
 *
 * @throws {Error} When you call it outside a PredictiveSearchProvider.
 * @publicDocs
 */
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
