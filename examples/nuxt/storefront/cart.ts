import type { CartDataFromHandlers, CartGetData } from "@shopify/hydrogen";
import { createCartComponents } from "@shopify/hydrogen/vue";

import { useFetch, useRequestEvent } from "#imports";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();

/** Fetches the cart during server rendering, and marks a page that embeds a buyer's cart as private. */
export async function useServerRenderedCart() {
  // Nuxt loses the composable context after an await, so read the page's event first.
  const event = import.meta.server ? useRequestEvent() : undefined;
  const { data } = await useFetch<CartGetData<CartDataFromHandlers<typeof cartHandlers>>>(
    "/api/cart",
    { key: "cart" },
  );

  // `useFetch` runs `/api/cart` as its own request, so the cart route's private headers never reach this page.
  if (event && data.value?.cart) {
    const { shopifyRequestContext } = event.context;
    if (!shopifyRequestContext) {
      throw new Error("Shopify request context was not created for this server request.");
    }
    shopifyRequestContext.markResponseAsPersonalized("server-rendered-cart");
  }

  return data;
}
