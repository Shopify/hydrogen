import type { StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type { ShopifyRequestContext } from "../request-context";
import { getCartIdFromCookie } from "./cookie";
import { cartQueries } from "./queries";
import type { CartData } from "./state";

type MergeCartData<TCart> = Omit<CartData, keyof TCart> & TCart;

/**
 * Infers the cart data type from a custom Storefront API cart query.
 *
 * The type takes the cart field from the query's result type and merges it with the base cart data type. getCart and the cart server handlers use it to type a cart that matches your query's fields.
 *
 * @publicDocs
 */
export type CartDataFromQuery<TQuery extends AnyStorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Result, infer _Variables, string>
    ? Result extends { cart?: (infer Cart) | null }
      ? MergeCartData<NonNullable<Cart>>
      : CartData
    : CartData;

/**
 * The result that getCart returns.
 *
 * @publicDocs
 */
export type CartResult<TCart extends CartData = CartData> = {
  /** The cart, or `null` when the cart ID is missing, the cart doesn't exist, or the query fails. */
  cart: TCart | null;
  /** GraphQL errors from the Storefront API when the cart query fails. */
  errors?: Array<{ message: string }>;
  /** Response headers from the Storefront API, such as cache directives. The headers are empty when the function skips the request. */
  headers: Headers;
};

type CartQueryResult = {
  data: { cart?: unknown } | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

/** A Storefront API client. The cart functions use only its GraphQL method. */
type StorefrontCartClient = Pick<StorefrontClient, "graphql">;

type CartQueryDocument = AnyStorefrontQueryString;

type CartQueryGraphql = (
  query: CartQueryDocument,
  options: { variables: { id: string } },
) => Promise<CartQueryResult>;

/** A request, or a request context with a cookie header and URL, to read the cart ID from. */
type CartIdSource = Request | Pick<ShopifyRequestContext, "cookie" | "url">;

/**
 * Reads the cart ID from a request.
 *
 * The function reads the `cartId` search parameter first, and the `cart` cookie when the URL has no cart ID. The function returns a search parameter value unchanged and adds the `gid://shopify/Cart/` prefix to a cookie value.
 *
 * @param input The request or request context to read the cart ID from.
 * @returns The cart ID, or `null` when neither the search parameter nor the cookie has one.
 * @example
 * ```ts
 * // In a framework loader
 * const cartId = getCartId(request);
 * if (cartId) {
 *   const { cart } = await getCart(cartId, storefront);
 * }
 * ```
 * @publicDocs
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
 * A custom cart query returns a cart with that query's fields. The function passes the cart ID as the query's only variable. Declare an `$id` variable in a custom query.
 *
 * When the cart ID is `null`, the function returns a `null` cart without a network request. The function throws when the Storefront API request fails.
 *
 * @param cartId The ID of the cart to fetch, or `null` to skip the request.
 * @param storefront The Storefront API client that runs the cart query.
 * @param cartQuery A cart query document that replaces the default cart query.
 * @returns The cart or `null`, any GraphQL errors, and the Storefront API response headers.
 * @example
 * ```ts
 * const cartId = getCartId(request);
 * const { cart, errors, headers } = await getCart(cartId, storefront);
 *
 * // With a custom query
 * const { cart } = await getCart(cartId, storefront, CUSTOM_CART_QUERY);
 * ```
 * @publicDocs
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

/**
 * Fetches a cart by ID from the Storefront API.
 *
 * A custom cart query returns a cart with that query's fields. The function passes the cart ID as the query's only variable. Declare an `$id` variable in a custom query.
 *
 * When the cart ID is `null`, the function returns a `null` cart without a network request. The function throws when the Storefront API request fails.
 *
 * @example
 * ```ts
 * const cartId = getCartId(request);
 * const { cart, errors, headers } = await getCart(cartId, storefront);
 *
 * // With a custom query
 * const { cart } = await getCart(cartId, storefront, CUSTOM_CART_QUERY);
 * ```
 * @publicDocs
 */
export type GetCartForDocs =
  /**
   * @param cartId - The ID of the cart to fetch, or `null` to skip the request.
   * @param storefront - The Storefront API client that runs the cart query.
   * @param cartQuery - A cart query document that replaces the default cart query.
   * @returns The cart or `null`, any GraphQL errors, and the Storefront API response headers.
   */
  (
    cartId: string | null,
    storefront: StorefrontCartClient,
    cartQuery?: AnyStorefrontQueryString,
  ) => Promise<CartResult<CartData>>;
