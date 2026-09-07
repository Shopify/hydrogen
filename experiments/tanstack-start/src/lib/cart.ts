import type { CartDataFromHandlers, CartState } from "@shopify/hydrogen";
import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "~/server/cart-handlers";

export type CartData = CartDataFromHandlers<typeof cartHandlers>;
export type CartStoreData = CartState<CartData>["data"];
export type CartLine = CartStoreData["lines"]["nodes"][number];

export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
