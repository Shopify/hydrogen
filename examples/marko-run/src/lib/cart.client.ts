import {
  configureCartEndpoint,
  createCartStore,
  type CartData,
  type CartState,
  type CartStore,
} from "@shopify/hydrogen";

export const CART_ENDPOINT = "/api/cart";

let cartStore: CartStore | null = null;
let connected = false;

export type ClientCartState = CartState<CartData>;

export function getCartStore(): CartStore {
  if (!cartStore) cartStore = createCartStore();
  return cartStore;
}

export function connectCartStore(): CartStore {
  const store = getCartStore();
  if (connected || typeof window === "undefined") return store;

  configureCartEndpoint(CART_ENDPOINT);
  store.connect();
  store.fetch().catch(() => {});
  connected = true;
  return store;
}

export function subscribeCartState(listener: (state: ClientCartState) => void): () => void {
  const store = connectCartStore();
  listener(store.getState() as ClientCartState);
  return store.subscribe(() => listener(store.getState() as ClientCartState));
}

export async function handleCartFormSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  await connectCartStore().handleFormSubmit(event);
}
