import { browser } from "$app/environment";
import {
  configureCartEndpoint,
  createCartFormRegister,
  createCartStore,
  type CartDataFromHandlers,
  type CartState,
  type CartStore,
} from "@shopify/hydrogen";
import { readable, type Readable } from "svelte/store";

import type { cartHandlers } from "../hooks.server";

export const CART_ENDPOINT = "/api/cart";

type SvelteCartData = CartDataFromHandlers<typeof cartHandlers>;

let cartStore: CartStore = createCartStore();
let connected = false;

export function connectCartStore(): void {
  if (!browser || connected) return;

  configureCartEndpoint(CART_ENDPOINT);
  cartStore.connect();
  cartStore.fetch().catch(() => {});
  connected = true;
}

export function getCartStore(): CartStore {
  return cartStore;
}

export function cartState(): Readable<CartState<SvelteCartData>>;
export function cartState<S>(
  selector: (state: CartState<SvelteCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readable<S>;
export function cartState<S>(
  selector?: (state: CartState<SvelteCartData>) => S,
  isEqual?: (a: S, b: S) => boolean,
): Readable<CartState<SvelteCartData> | S> {
  const resolve = selector ?? ((state: CartState<SvelteCartData>) => state as unknown as S);
  let selected = resolve(cartStore.getState() as CartState<SvelteCartData>);

  return readable(selected, (set) => {
    return cartStore.subscribe(() => {
      const next = resolve(cartStore.getState() as CartState<SvelteCartData>);
      if (selector && isEqual?.(selected as S, next)) return;
      selected = next;
      set(next);
    });
  });
}

export function createCartForm() {
  const register = createCartFormRegister();

  function formProps(opts?: {
    beforeSubmit?: (event: Event) => void;
    afterSubmit?: (event: Event) => void;
  }) {
    return {
      method: "post" as const,
      action: CART_ENDPOINT,
      onsubmit: (event: SubmitEvent) => {
        opts?.beforeSubmit?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        cartStore.handleFormSubmit(event).catch(() => {});
        opts?.afterSubmit?.(event);
      },
    };
  }

  return { register, formProps };
}
