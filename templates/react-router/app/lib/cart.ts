import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "~/lib/cart-handlers";

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
