import {
  computed,
  defineComponent,
  h,
  inject,
  onMounted,
  onScopeDispose,
  onUnmounted,
  provide,
  shallowRef,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from "vue";

import { trackCartAnalytics } from "../core/analytics/cart-tracker";
import {
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  type CreateCartStoreOptions,
  type CartStore,
} from "../core/cart/cart";
import { createCartFormRegister, type CartFormRegister } from "../core/cart/form";
import type { CartDataFromHandlers } from "../core/cart/server-handlers";
import type { CartData, CartState } from "../core/cart/state";

const DEFAULT_CART_ENDPOINT = "/api/cart";

let cartEndpoint = DEFAULT_CART_ENDPOINT;

const CartStoreKey: InjectionKey<CartStore> = Symbol("CartStore");

export function configureCartEndpoint(endpoint: string): void {
  cartEndpoint = endpoint;
  configureCoreCartEndpoint(endpoint);
}

export function getCartEndpoint(): string {
  return cartEndpoint;
}

type TypedUseCart<TData extends CartData> = {
  (): Readonly<ShallowRef<CartState<TData>>>;
  <S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ): Readonly<ShallowRef<S>>;
};

type TypedUseOptionalCart<TData extends CartData> = <S>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
) => Readonly<ShallowRef<S | undefined>>;

type CartInitialData<TData extends CartData = CartData> =
  CreateCartStoreOptions<TData>["initialData"];

type TypedCartProvider<TData extends CartData> = {
  new (): { $props: { initialData?: CartInitialData<TData> } };
};

/** Actions for reconciling cart state after updates outside Standard Actions. */
export type CartActions = Pick<CartStore, "refresh">;

type TypedCartComponents<TData extends CartData> = {
  CartProvider: TypedCartProvider<TData>;
  useCart: TypedUseCart<TData>;
  useOptionalCart: TypedUseOptionalCart<TData>;
  useCartActions: typeof useCartActions;
  useCartForm: typeof useCartForm;
};

function createTypedCartProvider<TData extends CartData>(): TypedCartProvider<TData> {
  const TypedCartProvider = defineComponent(
    (props: { initialData?: CartInitialData<TData> }, { slots }) => {
      return () =>
        h(
          CartProvider,
          { initialData: props.initialData as CartInitialData | undefined },
          slots.default,
        );
    },
    { name: "CartProvider", props: ["initialData"] },
  );

  return TypedCartProvider as unknown as TypedCartProvider<TData>;
}

export function useCartStore(composableName = "useCartStore"): CartStore {
  const store = inject(CartStoreKey, null);
  if (!store) {
    throw new Error(`${composableName} must be used inside a <CartProvider>.`);
  }
  return store;
}

function useOptionalCartStore(): CartStore | null {
  return inject(CartStoreKey, null);
}

/**
 * Vue component that creates and manages a {@link CartStore} instance.
 *
 * Calls {@link CartStore.connect} on mount and {@link CartStore.destroy} on unmount.
 * All cart composables (`useCart`, `useCartForm`, `useCartActions`) must be
 * descendants of this component.
 *
 * @example
 * ```vue
 * <CartProvider :initialData="{ cart: loaderData.cart }">
 *   <App />
 * </CartProvider>
 * ```
 */
export const CartProvider = defineComponent({
  name: "CartProvider",
  props: {
    initialData: {
      type: Object as PropType<CartInitialData>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const store = createCartStore({ initialData: props.initialData });
    provide(CartStoreKey, store);

    onMounted(() => {
      configureCoreCartEndpoint(cartEndpoint);
      store.connect();
    });

    onUnmounted(() => {
      store.destroy();
    });

    return () => slots.default?.();
  },
});

/**
 * Subscribes to {@link CartState} as a Vue `ShallowRef`.
 *
 * Without a selector, returns the full `CartState`. With a selector, returns
 * a `ShallowRef` of the selected slice — the ref updates only when the
 * selected value changes (by reference, or by custom `isEqual`).
 *
 * @example
 * ```vue
 * <script setup>
 * // Full state
 * const state = useCart();
 *
 * // Selected slice — re-renders only when lines change
 * const lines = useCart((s) => s.data.lines.nodes);
 *
 * // Check if a specific line is pending
 * const isPending = useCart((s) => s.pending.lines.has(lineId));
 * </script>
 * ```
 */
export function useCart(): Readonly<ShallowRef<CartState>>;
export function useCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S>>;
export function useCart<TData extends CartData = CartData, S = unknown>(
  selector?: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S | CartState>> {
  const store = useCartStore("useCart");
  const resolve = selector ?? ((state: CartState<TData>) => state as unknown as S);
  return useCartSelector(store, resolve, isEqual) as Readonly<ShallowRef<S>>;
}

/**
 * Returns cart actions for reconciling state after out-of-band mutations.
 *
 * Currently exposes {@link CartStore.refresh} — call it after server-side cart
 * mutations that bypass the form system.
 *
 * @example
 * ```vue
 * <script setup>
 * const { refresh } = useCartActions();
 *
 * async function handleServerAction() {
 *   await createCartOnServer();
 *   refresh();
 * }
 * </script>
 * ```
 */
export function useCartActions(): CartActions {
  const store = useCartStore("useCartActions");
  return { refresh: store.refresh };
}

/**
 * Subscribes the {@link CartStore} to the analytics event dispatcher.
 *
 * Call once near the root of your app. Starts tracking on mount via `onMounted`
 * and cleans up via `onScopeDispose`.
 *
 * @example
 * ```vue
 * <script setup>
 * useCartAnalytics();
 * </script>
 * ```
 */
export function useCartAnalytics(): void {
  const store = useCartStore("useCartAnalytics");
  let stopTracking: (() => void) | undefined;

  onMounted(() => {
    stopTracking = trackCartAnalytics(store);
  });

  onScopeDispose(() => stopTracking?.());
}

/**
 * Like `useCart`, but returns `undefined` when rendered outside a `<CartProvider>`.
 * @internal
 */
export function useOptionalCart<TData extends CartData = CartData, S = unknown>(
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S | undefined>> {
  const store = useOptionalCartStore();
  if (!store) return shallowRef<S | undefined>(undefined);
  return useCartSelector(store, selector, isEqual);
}

function useCartSelector<TData extends CartData = CartData, S = unknown>(
  store: CartStore,
  selector: (state: CartState<TData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<ShallowRef<S>> {
  const selected = shallowRef<S>(selector(store.getState() as CartState<TData>));

  const unsubscribe = store.subscribe(() => {
    const next = selector(store.getState() as CartState<TData>);
    if (isEqual?.(selected.value, next)) return;
    selected.value = next;
  });

  onScopeDispose(unsubscribe);

  return selected as Readonly<ShallowRef<S>>;
}

/**
 * Returns form props, a field register function, and reactive pending state
 * for building cart forms in Vue.
 *
 * Unlike the React hook, the Vue variant includes `isPending` — a reactive
 * object with `initial` (`ComputedRef<boolean>`) for the initial cart load
 * and `lines(lineId?)` for checking per-line or any-line pending state.
 *
 * @example
 * ```vue
 * <script setup>
 * const { formProps, register, isPending } = useCartForm();
 * </script>
 *
 * <template>
 *   <form v-bind="formProps()">
 *     <input v-bind="register('lineId', { value: line.id })" />
 *     <input v-bind="register('quantity', { value: line.quantity, interactive: true })" />
 *     <button v-bind="register('set')" />
 *     <button v-bind="register('increase')">+</button>
 *     <button v-bind="register('decrease')">−</button>
 *     <span v-if="isPending.lines(line.id)">Updating…</span>
 *   </form>
 * </template>
 * ```
 */
export function useCartForm(): {
  formProps: (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }) => Record<string, unknown>;
  register: CartFormRegister;
  isPending: {
    initial: ComputedRef<boolean>;
    lines: (lineId?: string) => boolean;
  };
} {
  const store = useCartStore("useCartForm");
  const loading = useCart((s) => s.loading);
  const pendingLines = useCart((s) => s.pending.lines);
  const register = createCartFormRegister();

  const formProps = (opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }): Record<string, unknown> => ({
    onSubmit: (e: Event) => {
      opts?.beforeSubmit?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      store.handleFormSubmit(e as SubmitEvent).catch(() => {});
      opts?.afterSubmit?.(e);
    },
    method: "post",
    action: cartEndpoint,
  });

  const isPending = {
    initial: computed(() => loading.value),
    lines: (lineId?: string): boolean =>
      lineId ? pendingLines.value.has(lineId) : pendingLines.value.size > 0,
  };

  return { formProps, register, isPending };
}

/**
 * Factory that returns typed cart components and composables matched to your
 * server handler's cart query shape.
 *
 * The generic `THandlers` parameter is inferred from your {@link createCartServerHandlers}
 * call, so every composable's {@link CartState} carries your custom cart fields.
 *
 * @example
 * ```ts
 * import type { cartServerHandlers } from "./server/cart.server";
 *
 * const {
 *   CartProvider,
 *   useCart,
 *   useOptionalCart,
 *   useCartActions,
 *   useCartForm,
 * } = createCartComponents<typeof cartServerHandlers>();
 * ```
 */
export function createCartComponents<THandlers>(): TypedCartComponents<
  CartDataFromHandlers<THandlers>
> {
  type TData = CartDataFromHandlers<THandlers>;
  const TypedCartProvider = createTypedCartProvider<TData>();

  const useTypedCart = ((
    selector?: (state: CartState<TData>) => unknown,
    isEqual?: (a: unknown, b: unknown) => boolean,
  ) => {
    if (!selector) return useCart() as Readonly<ShallowRef<CartState<TData>>>;
    return useCart<TData, unknown>(selector, isEqual);
  }) as TypedUseCart<TData>;

  const useTypedOptionalCart = (<S>(
    selector: (state: CartState<TData>) => S,
    isEqual?: (a: S, b: S) => boolean,
  ) => useOptionalCart<TData, S>(selector, isEqual)) as TypedUseOptionalCart<TData>;

  return {
    CartProvider: TypedCartProvider,
    useCart: useTypedCart,
    useOptionalCart: useTypedOptionalCart,
    useCartActions,
    useCartForm,
  };
}
