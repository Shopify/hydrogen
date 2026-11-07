import type { StorefrontClient } from "../../client";
import type { CartAction } from "./actions";
import type { CartData, CartUserError, CartWarning } from "./state";

export type CartTransportContext = {
  storefrontClient: StorefrontClient;
  customerAccessToken?: string;
};

export type CartReadResult = {
  cart: CartData | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

export type CartWriteResult = {
  cart: CartData | null;
  userErrors: Array<Omit<CartUserError, "field"> & { field?: string[] | null }>;
  warnings: CartWarning[];
  headers: Headers;
};

export interface CartTransport {
  read(cartId: string, ctx: CartTransportContext): Promise<CartReadResult>;
  apply(
    cartId: string | null,
    action: CartAction,
    ctx: CartTransportContext,
  ): Promise<CartWriteResult>;
}
