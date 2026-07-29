import {
  createCollectionStore,
  type CollectionData,
  type CollectionState,
  type CollectionStore,
  normalizeCollectionSearch,
} from "@shopify/hydrogen";
import {
  inject,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from "vue";

type CollectionContext = {
  store: ShallowRef<CollectionStore>;
};

const collectionContextKey = Symbol("NuxtCollectionStore");

export function provideCollectionStore(options: {
  data: Ref<CollectionData> | ComputedRef<CollectionData>;
  urlSearch: Ref<string> | ComputedRef<string>;
  onChange: (searchString: string) => void;
}): void {
  const readUrlSearch = () => options.urlSearch.value;
  const storeRef = shallowRef(
    createCollectionStore({
      data: options.data.value,
      urlSearch: readUrlSearch(),
    }),
  );

  storeRef.value.setOnBrowseChange(handleBrowseChange);

  provide(collectionContextKey, {
    store: storeRef,
  } satisfies CollectionContext);

  function resetStore() {
    storeRef.value.setOnBrowseChange(null);
    const store = createCollectionStore({
      data: options.data.value,
      urlSearch: readUrlSearch(),
    });
    storeRef.value = store;
    store.setOnBrowseChange(handleBrowseChange);
  }

  function handleBrowseChange() {
    const params = storeRef.value.serializeToParams();
    const search = params.toString();
    options.onChange(search ? `?${search}` : "");
  }

  function reconcile() {
    const store = storeRef.value;
    const urlSearch = normalizeCollectionSearch(readUrlSearch());
    const dataSearch = normalizeCollectionSearch(options.data.value.dataSearch);
    const params = new URLSearchParams(urlSearch);

    if (!store.matchesParams(params)) {
      store.syncFromParams(params);
    }

    if (dataSearch === urlSearch) {
      store.settle();
    }
  }

  watch(
    () => options.data.value.handle,
    (newHandle, oldHandle) => {
      if (newHandle !== oldHandle) resetStore();
    },
  );

  watch(() => [readUrlSearch(), options.data.value] as const, reconcile, {
    flush: "sync",
    immediate: true,
    deep: true,
  });

  onUnmounted(() => {
    storeRef.value.setOnBrowseChange(null);
  });
}

function useCollectionContext(composableName: string): CollectionContext {
  const ctx = inject<CollectionContext | null>(collectionContextKey, null);
  if (!ctx) throw new Error(`${composableName} must be used after provideCollectionStore().`);
  return ctx;
}

export function useCollection(): Readonly<Ref<CollectionState>>;
export function useCollection<S>(
  selector: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<S>>;
export function useCollection<S>(
  selector?: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<CollectionState | S>> {
  const { store: storeRef } = useCollectionContext("useCollection");
  const resolve = selector ?? ((state: CollectionState) => state as unknown as S);
  const selected = shallowRef<CollectionState | S>(resolve(storeRef.value.getState()));

  watch(
    () => storeRef.value,
    (store, _, onCleanup) => {
      selected.value = resolve(store.getState());
      const unsubscribe = store.subscribe(() => {
        const next = resolve(store.getState());
        if (selector && isEqual?.(selected.value as S, next)) return;
        selected.value = next;
      });
      onCleanup(unsubscribe);
    },
    { immediate: true },
  );

  return selected as Readonly<Ref<CollectionState | S>>;
}

export function useCollectionActions() {
  const { store } = useCollectionContext("useCollectionActions");

  return {
    setFilters: (...args: Parameters<CollectionStore["setFilters"]>) =>
      store.value.setFilters(...args),
    toggleFilter: (...args: Parameters<CollectionStore["toggleFilter"]>) =>
      store.value.toggleFilter(...args),
    toggleFilterInput: (...args: Parameters<CollectionStore["toggleFilterInput"]>) =>
      store.value.toggleFilterInput(...args),
    setSortKey: (...args: Parameters<CollectionStore["setSortKey"]>) =>
      store.value.setSortKey(...args),
    setSortByValue: (...args: Parameters<CollectionStore["setSortByValue"]>) =>
      store.value.setSortByValue(...args),
    reset: (...args: Parameters<CollectionStore["reset"]>) => store.value.reset(...args),
    handleFormSubmit: (...args: Parameters<CollectionStore["handleFormSubmit"]>) =>
      store.value.handleFormSubmit(...args),
  };
}

export function useCollectionForm() {
  const actions = useCollectionActions();

  function formProps(opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }): Record<string, unknown> {
    return {
      onSubmit: (e: Event) => {
        opts?.beforeSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        actions.handleFormSubmit(e as SubmitEvent);
        opts?.afterSubmit?.(e);
      },
    };
  }

  return { formProps };
}
