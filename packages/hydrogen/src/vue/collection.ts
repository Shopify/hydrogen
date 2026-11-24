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
  type CollectionActions,
  type CollectionData,
  type CollectionReconciler,
  type CollectionStore,
} from "../core/collection";
import type { CollectionState } from "../core/collection";
import { getLogger } from "../core/logging";

export type { CollectionActions, CollectionData };

const log = getLogger("collection");

const CollectionStoreKey: InjectionKey<ShallowRef<CollectionStore>> = Symbol("CollectionStore");

/** Adds a function that runs before each navigation of the provider. Returns a function that removes it. */
type RegisterBrowseChangeListener = (listener: () => void) => () => void;

const BrowseChangeKey: InjectionKey<RegisterBrowseChangeListener> =
  Symbol("CollectionBrowseChange");

/**
 * Creates a collection store and keeps its filters and sort in sync with the URL.
 * The provider creates a new store when the collection handle changes, such as on navigation to a different collection.
 *
 * The provider takes `data` and `url-search` props, emits a `change` event with the search string to navigate to, and renders its default slot.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { CollectionProvider, type CollectionData } from '@shopify/hydrogen/vue';
 * import { useRoute, useRouter } from 'vue-router';
 *
 * const props = defineProps<{ data: CollectionData; urlSearch: string }>();
 * const route = useRoute();
 * const router = useRouter();
 *
 * // `search` includes the leading `?`, so append it to the path as-is.
 * const onChange = (search: string) => router.replace(`${route.path}${search}`);
 * </script>
 *
 * <template>
 *   <CollectionProvider
 *     :data="props.data"
 *     :url-search="props.urlSearch"
 *     @change="onChange"
 *   >
 *     <slot />
 *   </CollectionProvider>
 * </template>
 * ```
 * @publicDocs
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

    // `CollectionView` adds its update events here, so they start before the navigation.
    const browseChangeListeners = new Set<() => void>();
    provide(BrowseChangeKey, (listener) => {
      browseChangeListeners.add(listener);
      return () => {
        browseChangeListeners.delete(listener);
      };
    });
    const onBrowseChange = () => {
      for (const listener of browseChangeListeners) {
        // Analytics must never stop the navigation.
        try {
          listener();
        } catch (error) {
          log.error("collection browse change listener failed", { error });
        }
      }
      reconciler.handleBrowseChange();
    };
    initialStore.setOnBrowseChange(onBrowseChange);

    function resetStore() {
      storeRef.value.setOnBrowseChange(null);
      const store = createCollectionStore({
        data: props.data,
        urlSearch: readUrlSearch(),
      });
      storeRef.value = store;
      reconciler.reset(readUrlSearch());
      store.setOnBrowseChange(onBrowseChange);
    }

    watch(
      () => props.data.handle,
      (newHandle, oldHandle) => {
        if (newHandle === oldHandle) return;
        resetStore();
      },
    );

    // Watch the values, not the `data` object. A parent that renders a new `data` object with the
    // same values sets it before `urlSearch`, and the sync watcher would reconcile the new URL's
    // store against the old URL in between, and settle it.
    watch(
      [readUrlSearch, () => props.data.handle, () => props.data.dataSearch],
      () => {
        reconciler.reconcile(readUrlSearch(), props.data.dataSearch);
      },
      { flush: "sync", immediate: true },
    );

    onUnmounted(() => {
      storeRef.value.setOnBrowseChange(null);
    });

    return () => slots.default?.();
  },
});

/**
 * Returns a shallow ref of the nearest collection provider's store. The ref follows the new store
 * when the provider replaces the store. Throws outside a provider, with the name of the caller in
 * the message.
 *
 * @internal
 */
export function useRequiredStoreRef(composableName: string): ShallowRef<CollectionStore> {
  const storeRef = inject(CollectionStoreKey, null);
  if (!storeRef) {
    throw new Error(`${composableName} must be used inside a <CollectionProvider>.`);
  }
  return storeRef;
}

/**
 * Returns the function that adds a listener for the filter and sort changes of the nearest
 * collection provider. The provider calls each listener before it navigates.
 *
 * @internal
 */
export function useRegisterBrowseChangeListener(
  composableName: string,
): RegisterBrowseChangeListener {
  const register = inject(BrowseChangeKey, null);
  if (!register) {
    throw new Error(`${composableName} must be used inside a <CollectionProvider>.`);
  }
  return register;
}

/**
 * Returns a read-only shallow ref of the collection state. The ref follows the new store when the provider replaces the store.
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
 * @publicDocs
 */
export function useCollection(): Readonly<ShallowRef<CollectionState>>;
/**
 * With a selector, the composable returns a ref of the selector's value.
 * Pass an `isEqual` comparator to skip updates for equal values. The composable throws outside the collection provider.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const status = useCollection(s => s.status);
 * </script>
 * ```
 * @publicDocs
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
 * Returns methods that change filters and sort. After each change, the collection provider emits a `change` event with the new search string.
 *
 * The composable throws outside the collection provider.
 *
 * @publicDocs
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
 * Returns form props that progressively enhance collection filter forms.
 *
 * Bind the result of `formProps()` on the form. Its submit handler cancels the native submission and applies the form's filter and sort fields to the store.
 * The `beforeSubmit` and `afterSubmit` callbacks receive the native submit event. The composable throws outside the collection provider.
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
 * @publicDocs
 */
export function useCollectionForm(): {
  formProps: (opts?: {
    beforeSubmit?: (e: SubmitEvent) => void;
    afterSubmit?: (e: SubmitEvent) => void;
  }) => Record<string, unknown>;
} {
  const actions = useCollectionActions();

  const formProps = (opts?: {
    beforeSubmit?: (e: SubmitEvent) => void;
    afterSubmit?: (e: SubmitEvent) => void;
  }): Record<string, unknown> => ({
    onSubmit: (e: SubmitEvent) => {
      opts?.beforeSubmit?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      actions.handleFormSubmit(e);
      opts?.afterSubmit?.(e);
    },
  });

  return { formProps };
}
