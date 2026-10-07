import type { StorefrontClient } from "../../client";
import type { AnyStorefrontQueryString, StorefrontQueryString } from "../../graphql";
import type { ShopifyRequestContext } from "../request-context";
import { getCartIdFromCookie } from "./cookie";
import { cartQueries } from "./queries";
import type { CartData } from "./state";

type MergeCartData<TCart> = Omit<CartData, keyof TCart> & TCart;

/**
 * Gets the cart data type from a custom Storefront API cart query.
 *
 * The type adds the cart fields from your query to the base cart data type.
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
 * The cart that getCart returns, with any GraphQL errors and the Storefront API response headers.
 *
 * @publicDocs
 */
export type CartResult<TCart extends CartData = CartData> = {
  /** The cart, or `null` when the cart ID is missing, the cart doesn't exist, or the query fails. */
  cart: TCart | null;
  /** GraphQL errors from the cart query. */
  errors?: Array<{ message: string }>;
  /** The Storefront API response headers, such as cache directives. The headers are empty when getCart skips the request. */
  headers: Headers;
};

type CartQueryResult = {
  data: { cart?: unknown } | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

/** The Storefront API client that runs the cart query. */
type StorefrontCartClient = Pick<StorefrontClient, "graphql">;

type CartQueryDocument = AnyStorefrontQueryString;

type CartQueryGraphql = (
  query: CartQueryDocument,
  options: { variables: { id: string } },
) => Promise<CartQueryResult>;

/** A request, or a request context with a cookie header and a URL. */
type CartIdSource = Request | Pick<ShopifyRequestContext, "cookie" | "url">;

/**
 * Reads the cart ID from a request.
 *
 * The function checks the `cartId` search parameter first, then the `cart` cookie. The function returns a search parameter value unchanged and adds the `gid://shopify/Cart/` prefix to a cookie value.
 *
 * @param input The request or request context that carries the cart ID.
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
 * Pass a custom cart query to get a cart with that query's fields. Declare an `$id` variable in the query. The function passes the cart ID as the query's only variable.
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
 * Pass a custom cart query to get a cart with that query's fields. Declare an `$id` variable in the query. The function passes the cart ID as the query's only variable.
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
