import {
  defineComponent,
  inject,
  onUnmounted,
  provide,
  shallowRef,
  toValue,
  watch,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from "vue";

import {
  createCollectionStore,
  createCollectionReconciler,
  type CollectionData,
  type CollectionReconciler,
  type CollectionStore,
} from "../core/collection";
import type { CollectionState } from "../core/collection";

export type { CollectionData };

const CollectionStoreKey: InjectionKey<ShallowRef<CollectionStore>> = Symbol("CollectionStore");

/** Mutation methods exposed by the collection store. */
export type CollectionActions = Pick<
  CollectionStore,
  | "setFilters"
  | "toggleFilter"
  | "toggleFilterInput"
  | "setSortKey"
  | "setSortByValue"
  | "reset"
  | "handleFormSubmit"
>;

/**
 * Manages the lifecycle of a {@link CollectionStore}: creates on mount and syncs
 * with URL changes. Recreates the store when `data.handle` changes
 * (navigating to a different collection).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { CollectionProvider, type CollectionData } from '@shopify/hydrogen/vue';
 *
 * const props = defineProps<{ data: CollectionData; urlSearch: string }>();
 * </script>
 *
 * <template>
 *   <CollectionProvider
 *     :data="props.data"
 *     :url-search="props.urlSearch"
 *     @change="(s) => router.replace({ search: s })"
 *   >
 *     <slot />
 *   </CollectionProvider>
 * </template>
 * ```
 */
export const CollectionProvider = defineComponent({
  name: "CollectionProvider",
  props: {
    data: {
      type: Object as PropType<CollectionData>,
      required: true,
    },
    urlSearch: {
      type: String,
      default: "",
    },
  },
  emits: {
    change: (searchString: string) => typeof searchString === "string",
  },
  setup(props, { slots, emit }) {
    const readUrlSearch = () => toValue(props.urlSearch);

    const initialStore = createCollectionStore({
      data: props.data,
      urlSearch: readUrlSearch(),
    });
    const storeRef = shallowRef<CollectionStore>(initialStore);
    provide(CollectionStoreKey, storeRef);

    let reconciler: CollectionReconciler = createCollectionReconciler(
      {
        getStore: () => storeRef.value,
        readUrlSearch,
        emitChange: (s) => emit("change", s),
      },
      readUrlSearch(),
    );
    initialStore.setOnBrowseChange(() => reconciler.handleBrowseChange());

    function resetStore() {
      storeRef.value.setOnBrowseChange(null);
      const store = createCollectionStore({
        data: props.data,
        urlSearch: readUrlSearch(),
      });
      storeRef.value = store;
      reconciler.reset(readUrlSearch());
      store.setOnBrowseChange(() => reconciler.handleBrowseChange());
    }

    watch(
      () => props.data.handle,
      (newHandle, oldHandle) => {
        if (newHandle === oldHandle) return;
        resetStore();
      },
    );

    watch(
      () => [readUrlSearch(), props.data] as const,
      () => {
        reconciler.reconcile(readUrlSearch(), props.data.dataSearch);
      },
      { flush: "sync", immediate: true, deep: true },
    );

    onUnmounted(() => {
      storeRef.value.setOnBrowseChange(null);
    });

    return () => slots.default?.();
  },
});

function useRequiredStoreRef(composableName: string): ShallowRef<CollectionStore> {
  const storeRef = inject(CollectionStoreKey, null);
  if (!storeRef) {
    throw new Error(`${composableName} must be used inside a <CollectionProvider>.`);
  }
  return storeRef;
}

/**
 * Subscribes to the collection store and returns a reactive ref of the full
 * state snapshot.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const state = useCollection();
 * </script>
 *
 * <template>
 *   <p>{{ state.status }}</p>
 * </template>
 * ```
 */
export function useCollection(): Readonly<ShallowRef<CollectionState>>;
/**
 * Subscribes to the collection store and returns a reactive ref of a derived
 * value via `selector`. Optionally accepts an `isEqual` comparator to skip
 * updates when the derived value is structurally unchanged.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const status = useCollection(s => s.status);
 * </script>
 * ```
 */
export function useCollection<S>(
  selector: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S>>;
export function useCollection<S>(
  selector?: (state: CollectionState) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<CollectionState | S>> {
  const storeRef = useRequiredStoreRef("useCollection");
  const resolve = selector ?? ((state: CollectionState) => state as unknown as S);
  const selected = shallowRef<CollectionState | S>(resolve(storeRef.value.getState()));

  watch(
    () => storeRef.value,
    (store, _, onCleanup) => {
      selected.value = resolve(store.getState());

      const unsubscribe = store.subscribe(() => {
        const next = resolve(store.getState());
        if (isEqual && selector) {
          if (isEqual(selected.value as S, next)) return;
        }
        selected.value = next;
      });

      onCleanup(unsubscribe);
    },
    { immediate: true },
  );

  return selected as Readonly<ShallowRef<CollectionState | S>>;
}

/**
 * Returns methods that change filters and sort. The store's `onBrowseChange`
 * callback (set by {@link CollectionProvider}) handles emitting `change` with a
 * serialized search string.
 */
export function useCollectionActions(): CollectionActions {
  const storeRef = useRequiredStoreRef("useCollectionActions");

  return {
    setFilters: (...args) => storeRef.value.setFilters(...args),
    toggleFilter: (...args) => storeRef.value.toggleFilter(...args),
    toggleFilterInput: (...args) => storeRef.value.toggleFilterInput(...args),
    setSortKey: (...args) => storeRef.value.setSortKey(...args),
    setSortByValue: (...args) => storeRef.value.setSortByValue(...args),
    reset: (...args) => storeRef.value.reset(...args),
    handleFormSubmit: (...args) => storeRef.value.handleFormSubmit(...args),
  };
}

/**
 * Returns form props for progressive-enhancement of collection filter forms.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { formProps } = useCollectionForm();
 * </script>
 *
 * <template>
 *   <form v-bind="formProps()" action="/collections/shoes">
 *     <input type="checkbox" name="filter.p.tag" value="sale" />
 *     <button type="submit">Apply</button>
 *   </form>
 * </template>
 * ```
 */
export function useCollectionForm(): {
  formProps: (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }) => Record<string, unknown>;
} {
  const actions = useCollectionActions();

  const formProps = (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }): Record<string, unknown> => ({
    onSubmit: (e: Event) => {
      opts?.beforeSubmit?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      actions.handleFormSubmit(e as SubmitEvent);
      opts?.afterSubmit?.(e);
    },
  });

  return { formProps };
}
