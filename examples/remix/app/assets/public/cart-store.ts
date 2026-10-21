import { configureCartEndpoint, createCartStore, type CartStore } from "@shopify/hydrogen";

import type { CartInitialData } from "../../lib/cart.ts";
import { cartApiPath } from "../../lib/public/cart-routes.ts";

let browserCartStore: CartStore | undefined;

/**
 * Returns the one cart store for this browser document. `initialData` from the server
 * only seeds the store; once connected, Hydrogen owns the cart state and publishes every
 * optimistic and confirmed change to subscribers. Returns `undefined` during server
 * rendering, where module state is shared across requests.
 */
export function getCartStore(
  initialData: CartInitialData | undefined,
  pathPrefix: string,
): CartStore | undefined {
  if (!globalThis.document) return undefined;

  if (!browserCartStore) {
    configureCartEndpoint(cartApiPath(pathPrefix));
    browserCartStore = createCartStore({ initialData });
  } else if (initialData?.cart && browserCartStore.getState().data.id === null) {
    // Another island created the store before server cart data arrived.
    browserCartStore.hydrate(initialData.cart);
  }

  browserCartStore.connect();
  return browserCartStore;
}
