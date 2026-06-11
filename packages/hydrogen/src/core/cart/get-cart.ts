import type { GenericStorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type { StorefrontRequestContext } from "../headers";
import { getCartIdFromCookie } from "./cookie";
import { cartQueries } from "./queries";
import type { CartData } from "./state";
import { createEmptyCartData } from "./state";

type MergeCartData<TCart> = Omit<CartData, keyof TCart> & TCart;

export type CartDataFromQuery<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result extends { cart?: (infer Cart) | null }
      ? MergeCartData<NonNullable<Cart>>
      : CartData
    : CartData;

export type CartResult<TCart extends CartData = CartData> = {
  cart: TCart;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

type CartQueryResult = {
  data: { cart?: unknown } | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

type StorefrontCartClient = Pick<GenericStorefrontClient, "graphql">;

type CartQueryDocument = AnyStorefrontQueryString;

type CartQueryGraphql = (
  query: CartQueryDocument,
  options: { variables: { id: string } },
) => Promise<CartQueryResult>;

type CartIdSource = Request | Pick<StorefrontRequestContext, "cookie" | "url">;

export function getCartId(input: CartIdSource): string | null {
  if (input.url) {
    const parsedUrl = new URL(input.url, "http://shop.dev");
    const cartId = parsedUrl.searchParams.get("cartId");
    if (cartId) return cartId;
  }

  return getCartIdFromCookie(input);
}

export async function getCart<TQuery extends AnyStorefrontQueryString = typeof cartQueries.cart>(
  cartId: string | null,
  storefront: StorefrontCartClient,
  cartQuery: TQuery = cartQueries.cart as TQuery,
): Promise<CartResult<CartDataFromQuery<TQuery>>> {
  if (!cartId) {
    return {
      cart: createEmptyCartData() as CartDataFromQuery<TQuery>,
      headers: new Headers(),
    };
  }

  const queryCart = storefront.graphql as CartQueryGraphql;
  const result = await queryCart(cartQuery, { variables: { id: cartId } });

  if (result.errors || !result.data?.cart) {
    return {
      cart: createEmptyCartData() as CartDataFromQuery<TQuery>,
      errors: result.errors,
      headers: result.headers,
    };
  }

  return { cart: result.data.cart as CartDataFromQuery<TQuery>, headers: result.headers };
}
