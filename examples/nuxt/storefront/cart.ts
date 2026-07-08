import {
  configureCartEndpoint,
  createCartFormRegister,
  createCartStore,
  type CartDataFromHandlers,
  type CreateCartStoreOptions,
  type CartState,
  type CartStore,
} from "@shopify/hydrogen";
import {
  computed,
  inject,
  onMounted,
  onScopeDispose,
  onUnmounted,
  provide,
  shallowRef,
  type Ref,
} from "vue";

import type { cartHandlers } from "./cart-handlers";

const DEFAULT_CART_ENDPOINT = "/api/cart";
const cartStoreKey = Symbol("NuxtCartStore");
const cartEndpointState = { value: DEFAULT_CART_ENDPOINT };

type NuxtCartData = CartDataFromHandlers<typeof cartHandlers>;
type NuxtCartInitialData = CreateCartStoreOptions<NuxtCartData>["initialData"];

export function getCartEndpoint(): string {
  return cartEndpointState.value;
}

export function provideCartStore(initialData?: NuxtCartInitialData): CartStore {
  configureCartEndpoint(cartEndpointState.value);
  const store = createCartStore({ initialData });
  provide(cartStoreKey, store);

  onMounted(() => {
    configureCartEndpoint(cartEndpointState.value);
    store.connect();
    if (!initialData) {
      store.fetch().catch(() => {});
    }
  });

  onUnmounted(() => {
    store.destroy();
  });

  return store;
}

export function useCartStore(): CartStore {
  const store = inject<CartStore | null>(cartStoreKey, null);
  if (!store) throw new Error("useCart must be used after provideCartStore().");
  return store;
}

export function useCart(): Readonly<Ref<CartState<NuxtCartData>>>;
export function useCart<S>(
  selector: (state: CartState<NuxtCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<S>>;
export function useCart<S>(
  selector?: (state: CartState<NuxtCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readonly<Ref<S | CartState<NuxtCartData>>> {
  const store = useCartStore();
  const resolve = selector ?? ((state: CartState<NuxtCartData>) => state as unknown as S);
  const selected = shallowRef<S | CartState<NuxtCartData>>(
    resolve(store.getState() as CartState<NuxtCartData>),
  );

  const unsubscribe = store.subscribe(() => {
    const next = resolve(store.getState() as CartState<NuxtCartData>);
    if (selector && isEqual?.(selected.value as S, next)) return;
    selected.value = next;
  });

  onScopeDispose(unsubscribe);

  return selected as Readonly<Ref<S | CartState<NuxtCartData>>>;
}

export function useCartForm() {
  const store = useCartStore();
  const loading = useCart((s) => s.loading);
  const pendingLines = useCart((s) => s.pending.lines);
  const register = createCartFormRegister();

  function formProps(opts?: {
    beforeSubmit?: (e: Event) => void;
    afterSubmit?: (e: Event) => void;
  }): Record<string, unknown> {
    return {
      onSubmit: (e: Event) => {
        opts?.beforeSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        store.handleFormSubmit(e as SubmitEvent).catch(() => {});
        opts?.afterSubmit?.(e);
      },
      method: "post",
      action: cartEndpointState.value,
    };
  }

  return {
    formProps,
    register,
    isPending: {
      initial: computed(() => loading.value),
      lines: (lineId?: string) =>
        lineId ? pendingLines.value.has(lineId) : pendingLines.value.size > 0,
    },
  };
}
