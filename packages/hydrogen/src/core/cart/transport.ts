import type { GetCartPayload, UpdateCartPayload } from "../../../vendor/standard-actions";
import type { StorefrontClient } from "../../client";
import type { CartData, CartUserError, CartWarning } from "./state";

export type CartTransportContext = {
  storefrontClient: StorefrontClient;
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

export interface CartTransport<TContext extends CartTransportContext = CartTransportContext> {
  getCart(payload: Required<GetCartPayload>, ctx: TContext): Promise<CartReadResult>;
  /** Creates a cart from the payload when it has no `cartId`. */
  updateCart(payload: UpdateCartPayload, ctx: TContext): Promise<CartWriteResult>;
}
