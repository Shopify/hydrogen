import type { CartDataFromHandlers } from "@shopify/hydrogen";
import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "~/lib/cart-handlers";

export type CartData = CartDataFromHandlers<typeof cartHandlers>;

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
