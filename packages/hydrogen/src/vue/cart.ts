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
  type CartActions,
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

export type { CartActions };

/** Cart provider and composables whose cart state carries the custom fields from your cart server handlers. */
type TypedCartComponents<TData extends CartData> = {
  /** The provider that creates the cart store. The provider connects the store on mount and destroys the store on unmount. */
  CartProvider: TypedCartProvider<TData>;
  /** Returns cart state as a read-only shallow ref. The selector is optional. Without a selector, the ref holds the full cart state. */
  useCart: TypedUseCart<TData>;
  /** Returns the slice of cart state that the selector picks as a read-only shallow ref. Outside the provider, the ref holds `undefined`. */
  useOptionalCart: TypedUseOptionalCart<TData>;
  /** Returns the `refresh` action. Call `refresh` after a server-side cart mutation that bypasses cart forms. */
  useCartActions: typeof useCartActions;
  /** Returns form props, a register function, and pending state for cart forms. */
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
 * Creates a cart store and shares the store with the cart composables below the provider.
 *
 * The provider connects the store on mount and destroys the store on unmount. Render every cart composable inside the provider. The provider creates its store once from the first initial data and ignores later changes.
 *
 * @example
 * ```vue
 * <CartProvider :initialData="{ cart: loaderData.cart }">
 *   <App />
 * </CartProvider>
 * ```
 * @publicDocs
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
 * Returns cart state as a read-only shallow ref.
 *
 * Without a selector, the ref holds the full cart state. With a selector, the ref holds the selected value. The ref updates when the selected value changes by reference, or when your `isEqual` function reports a change.
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
 * @publicDocs
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
 * Returns the cart action that syncs the cart after a mutation outside cart forms.
 *
 * Call `refresh` after a server-side cart mutation that bypasses cart forms, such as a server action that creates the cart.
 *
 * @returns The `refresh` action.
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
 * @publicDocs
 */
export function useCartActions(): CartActions {
  const store = useCartStore("useCartActions");
  return { refresh: store.refresh };
}

/**
 * Publishes cart analytics events when the cart changes.
 *
 * Call the composable once near the root of your app. The composable starts tracking on mount and stops when the component's scope ends. The composable throws when you call it outside the cart provider.
 *
 * @example
 * ```vue
 * <script setup>
 * useCartAnalytics();
 * </script>
 * ```
 * @publicDocs
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
 * Returns the slice of cart state that the selector picks as a read-only shallow ref. Outside the cart provider, the ref holds `undefined`.
 *
 * Use the composable in a component that also renders above the provider, such as a header cart badge on an error page.
 * Wherever the provider always exists, use the cart composable that throws. A missing provider then fails with an error.
 *
 * @example
 * ```vue
 * <script setup>
 * const count = useOptionalCart((state) => state.data.totalQuantity);
 * </script>
 *
 * <template>
 *   <span v-if="count !== undefined">Cart ({{ count }})</span>
 * </template>
 * ```
 * @publicDocs
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
 * Returns form props, a register function, and pending state for cart forms.
 *
 * The form props post to the cart endpoint and send each submission through the cart store. A `beforeSubmit` callback that prevents the event's default skips the cart submission.
 *
 * The pending state holds a computed ref that's `true` during a full cart load, and a function that checks whether one line or any line has a mutation in flight.
 *
 * Registering the quantity field with `interactive: true` returns numeric input attributes without auto-submit. Call attachQuantityInput on the input to submit the form when the quantity changes.
 *
 * @returns The form props function, the register function, and the pending state.
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
 *     <input v-bind="register('quantity', { value: line.quantity })" />
 *     <button v-bind="register('set')" />
 *     <button v-bind="register('increase')">+</button>
 *     <button v-bind="register('decrease')">−</button>
 *     <span v-if="isPending.lines(line.id)">Updating…</span>
 *   </form>
 * </template>
 * ```
 * @publicDocs
 */
export function useCartForm(): {
  formProps: (opts?: {
    beforeSubmit?: (e: SubmitEvent) => void;
    afterSubmit?: (e: SubmitEvent) => void;
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
    beforeSubmit?: (e: SubmitEvent) => void;
    afterSubmit?: (e: SubmitEvent) => void;
  }): Record<string, unknown> => ({
    onSubmit: (e: SubmitEvent) => {
      opts?.beforeSubmit?.(e);
      if (e.defaultPrevented) return;
      e.preventDefault();
      store.handleFormSubmit(e).catch(() => {});
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
 * Returns a cart provider and composables typed to the cart query in your cart server handlers.
 * Pass the type of your cart server handlers as the `THandlers` type argument. Every composable's cart state then includes your custom cart fields.
 *
 * On mount, the provider points cart requests at `/api/cart` and connects the store. Every composable except the optional cart composable throws when you call it outside the provider.
 *
 * @returns The typed cart provider, the cart state composables, and the cart actions and form composables.
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
 * @publicDocs
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
