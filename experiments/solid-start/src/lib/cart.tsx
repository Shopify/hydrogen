import {
  configureCartEndpoint,
  createCartFormRegister,
  createCartStore,
  type CartDataFromHandlers,
  type CartState,
  type CartStore,
} from "@shopify/hydrogen";
import { createContext, createSignal, onCleanup, onMount, useContext, type JSX } from "solid-js";

import type { cartHandlers } from "../middleware";

const DEFAULT_CART_ENDPOINT = "/api/cart";
const CartContext = createContext<CartStore>();

type SolidCartData = CartDataFromHandlers<typeof cartHandlers>;

export function getCartEndpoint(): string {
  return DEFAULT_CART_ENDPOINT;
}

export function CartProvider(props: { children: JSX.Element }) {
  const store = createCartStore();

  onMount(() => {
    configureCartEndpoint(DEFAULT_CART_ENDPOINT);
    store.connect();
    store.fetch().catch(() => {});
  });

  onCleanup(() => {
    store.destroy();
  });

  return <CartContext.Provider value={store}>{props.children}</CartContext.Provider>;
}

export function useCartStore(): CartStore {
  const store = useContext(CartContext);
  if (!store) throw new Error("useCart must be used inside <CartProvider>.");
  return store;
}

export const getCartStore = useCartStore;

export function useCart(): () => CartState<SolidCartData>;
export function useCart<S>(
  selector: (state: CartState<SolidCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): () => S;
export function useCart<S>(
  selector?: (state: CartState<SolidCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): () => CartState<SolidCartData> | S {
  const store = useCartStore();
  const resolve = selector ?? ((state: CartState<SolidCartData>) => state as unknown as S);
  const [selected, setSelected] = createSignal(
    resolve(store.getState() as CartState<SolidCartData>),
  );

  const unsubscribe = store.subscribe(() => {
    const next = resolve(store.getState() as CartState<SolidCartData>);
    if (selector && isEqual?.(selected() as S, next)) return;
    setSelected(() => next);
  });

  onCleanup(unsubscribe);

  return selected;
}

export function useCartForm() {
  const store = useCartStore();
  const register = createCartFormRegister();

  function formProps(opts?: {
    beforeSubmit?: (event: SubmitEvent) => void;
    afterSubmit?: (event: SubmitEvent) => void;
  }) {
    return {
      method: "post" as const,
      action: DEFAULT_CART_ENDPOINT,
      onSubmit: (event: SubmitEvent) => {
        opts?.beforeSubmit?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        store.handleFormSubmit(event).catch(() => {});
        opts?.afterSubmit?.(event);
      },
    };
  }

  return { register, formProps };
}
