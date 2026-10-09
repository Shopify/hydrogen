import { createCartComponents } from "@shopify/hydrogen/vue";

import type { cartHandlers } from "./cart-handlers";

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
