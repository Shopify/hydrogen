import type { StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type { ShopifyRequestContext } from "../request-context";
import { getCartIdFromCookie } from "./cookie";
import { cartQueries } from "./queries";
import type { CartData } from "./state";

type MergeCartData<TCart> = Omit<CartData, keyof TCart> & TCart;

/**
 * Infers the {@link CartData} shape from a custom Storefront API cart query string.
 *
 * When you pass a custom cart query to {@link getCart}, this type extracts the
 * `cart` field from the query's result type and merges it with the base
 * {@link CartData} interface, so the returned data is fully typed to your query.
 */
export type CartDataFromQuery<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result extends { cart?: (infer Cart) | null }
      ? MergeCartData<NonNullable<Cart>>
      : CartData
    : CartData;

/** Result of a {@link getCart} call — the cart data (or `null`), any errors, and response headers. */
export type CartResult<TCart extends CartData = CartData> = {
  /** The cart, or `null` when no cart exists or the query failed. */
  cart: TCart | null;
  errors?: Array<{ message: string }>;
  /** Response headers from the Storefront API (e.g. cache directives). */
  headers: Headers;
};

type CartQueryResult = {
  data: { cart?: unknown } | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

type StorefrontCartClient = Pick<StorefrontClient, "graphql">;

type CartQueryDocument = AnyStorefrontQueryString;

type CartQueryGraphql = (
  query: CartQueryDocument,
  options: { variables: { id: string } },
) => Promise<CartQueryResult>;

type CartIdSource = Request | Pick<ShopifyRequestContext, "cookie" | "url">;

/**
 * Extracts the cart GID from a request.
 *
 * Checks the `cartId` search parameter first (for explicit linking), then
 * falls back to the `cart` cookie. Returns `null` when neither source
 * contains a cart identifier.
 *
 * @example
 * ```ts
 * // In a framework loader
 * const cartId = getCartId(request);
 * if (cartId) {
 *   const { cart } = await getCart(cartId, storefront);
 * }
 * ```
 */
export function getCartId(input: CartIdSource): string | null {
  if (input.url) {
    const parsedUrl = new URL(input.url, "https://hydrogen.local");
    const cartId = parsedUrl.searchParams.get("cartId");
    if (cartId) return cartId;
  }

  return getCartIdFromCookie(input);
}

/**
 * Fetches a cart by ID from the Storefront API.
 *
 * Accepts an optional custom cart query document — the result type is inferred
 * via {@link CartDataFromQuery} so the returned `cart` is fully typed to your
 * query's fields. When `cartId` is `null`, returns `{ cart: null }` immediately
 * without making a network request.
 *
 * @example
 * ```ts
 * const cartId = getCartId(request);
 * const { cart, errors, headers } = await getCart(cartId, storefront);
 *
 * // With a custom query
 * const { cart } = await getCart(cartId, storefront, CUSTOM_CART_QUERY);
 * ```
 */
export async function getCart<TQuery extends AnyStorefrontQueryString = typeof cartQueries.cart>(
  cartId: string | null,
  storefront: StorefrontCartClient,
  cartQuery: TQuery = cartQueries.cart as TQuery,
): Promise<CartResult<CartDataFromQuery<TQuery>>> {
  if (!cartId) {
    return {
      cart: null,
      headers: new Headers(),
    };
  }

  const queryCart = storefront.graphql as CartQueryGraphql;
  const result = await queryCart(cartQuery, { variables: { id: cartId } });

  if (result.errors || !result.data?.cart) {
    return {
      cart: null,
      errors: result.errors,
      headers: result.headers,
    };
  }

  return { cart: result.data.cart as CartDataFromQuery<TQuery>, headers: result.headers };
}
