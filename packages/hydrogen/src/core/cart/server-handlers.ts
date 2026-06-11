import type {
  GraphQLFormattedError,
  GenericStorefrontClient,
  RequestScopedPrivateStorefrontClient,
} from "../../client";
import type { AnyStorefrontQueryString } from "../../graphql";
import { createProxyResponseHeaders } from "../interceptors/proxy";
import type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteJsonResult,
  ShopifyRouteRedirectResult,
} from "../route-handlers";
import { createCallableRouteHandler } from "../route-handlers";
import { parseCartRequest } from "./actions";
import type { CartAction, CartLineAddInput } from "./actions";
import { getCartIdFromCookie, createCartCookie } from "./cookie";
import { getCart, getCartId, type CartDataFromQuery } from "./get-cart";
import {
  cartQueries,
  makeCartQueries,
  type CartDataForOptions,
  type CreateCartQueriesOptions,
} from "./queries";
import { toStandardActionsCart } from "./standard-actions-adapter";
import type { CartData } from "./state";

export const CART_API_PATH = "/api/cart" as const;
export const CART_GET_METHOD = "GET" as const;
export const CART_POST_METHOD = "POST" as const;
export const cartServerHandlersCartQuery: unique symbol = Symbol("storefront-kit.cartQuery");

export type CartGetData<TCart = CartData> = {
  cart: TCart;
  errors?: Array<{ message: string }>;
};

export type CartGetResult<TCart = CartData> = ShopifyRouteJsonResult<CartGetData<TCart>>;
export type CartErrorCode = "invalid_cart_request" | "missing_cart";
export type CartError = ShopifyRouteError & {
  code: CartErrorCode;
};
export type CartPostResult =
  | ShopifyRouteJsonResult<Record<string, unknown>>
  | ShopifyRouteRedirectResult
  | ShopifyRouteErrorResult<CartError>;

type CartGetHandlerContext = {
  storefrontClient: RequestScopedPrivateStorefrontClient;
  request?: Request;
};

type CartPostHandlerContext = {
  request: Request;
  storefrontClient: RequestScopedPrivateStorefrontClient;
};

export type CartGetHandler<TCart = CartData> = CallableRouteHandler<
  CartGetHandlerContext,
  CartGetResult<TCart>,
  typeof CART_API_PATH,
  typeof CART_GET_METHOD
>;

export type CartPostHandler = CallableRouteHandler<
  CartPostHandlerContext,
  CartPostResult,
  typeof CART_API_PATH,
  typeof CART_POST_METHOD
>;

export type CartServerHandlers<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  get: CartGetHandler<TCart>;
  post: CartPostHandler;
};

type AsyncHandlerResult<THandler> = THandler extends (
  ...args: infer _Args
) => Promise<infer TResult>
  ? TResult
  : never;

type CartGetHandlerResult<THandlers> = THandlers extends { get: infer THandler }
  ? AsyncHandlerResult<THandler>
  : never;

type CartDataFromHandlerResult<TResult> = [TResult] extends [never]
  ? never
  : TResult extends { data: { cart: infer TCart extends CartData } }
    ? TCart
    : CartData;

export type CartDataFromHandlers<THandlers> = CartDataFromHandlerResult<
  CartGetHandlerResult<THandlers>
>;

export type CreateCartServerHandlersOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = CreateCartQueriesOptions<TCartFragment>;

export function createCartServerHandlers(): CartServerHandlers<typeof cartQueries.cart>;
export function createCartServerHandlers<const TOptions extends CreateCartServerHandlersOptions>(
  options: TOptions,
): CartServerHandlers<AnyStorefrontQueryString, CartDataForOptions<TOptions>>;
export function createCartServerHandlers(
  options?: CreateCartServerHandlersOptions,
): CartServerHandlers {
  const queries = options
    ? makeCartQueries(options as CreateCartServerHandlersOptions<AnyStorefrontQueryString>)
    : cartQueries;
  const runtimeQueries = queries as RuntimeCartQueries;

  const handlers = {
    get: createCallableRouteHandler(
      CART_API_PATH,
      CART_GET_METHOD,
      (context: CartGetHandlerContext) => handleGet(context, runtimeQueries),
    ),
    post: createCallableRouteHandler(
      CART_API_PATH,
      CART_POST_METHOD,
      (context: CartPostHandlerContext) => handlePost(context, runtimeQueries),
    ),
  } as CartServerHandlers;

  Object.defineProperty(handlers, cartServerHandlersCartQuery, { value: queries.cart });
  return handlers;
}

type RuntimeCartQueries = typeof cartQueries;

async function handleGet(
  { request, storefrontClient }: CartGetHandlerContext,
  queries: RuntimeCartQueries,
): Promise<CartGetResult> {
  const cartIdSource = request ?? storefrontClient.requestContext;
  const result = await getCart(getCartId(cartIdSource), storefrontClient, queries.cart);
  const data = { cart: result.cart, ...(result.errors && { errors: result.errors }) };
  const headers = createProxyResponseHeaders(result.headers);

  return {
    type: "json",
    data,
    headers,
  };
}

async function handlePost(
  context: CartPostHandlerContext,
  queries: RuntimeCartQueries,
): Promise<CartPostResult> {
  const { request, storefrontClient } = context;
  const isFormRequest = !request.headers.get("content-type")?.includes("application/json");
  const redirectTarget = safeRedirectTarget(request);

  let action: CartAction;
  try {
    action = await parseCartRequest(request);
  } catch (error) {
    if (isFormRequest) return redirectResult(redirectTarget);
    return errorResult("invalid_cart_request", getErrorMessage(error, "Bad Request"));
  }

  const cartId = getCartId(request);

  if (action.intent !== "add" && !cartId) {
    if (isFormRequest) return redirectResult(redirectTarget);
    return errorResult("missing_cart", "No cart exists. Add an item first.");
  }

  const result = await executeMutation(action, cartId, storefrontClient, queries);
  const cookieCartId = getCartIdFromCookie(request);
  const headers = createProxyResponseHeaders(result.headers);

  // Only persist carts the browser already owns; explicit cartId query params are not adopted.
  if (cartId === cookieCartId && result.cartId !== null && result.cartId !== cookieCartId) {
    headers.append("set-cookie", createCartCookie(result.cartId));
  }

  if (isFormRequest) return redirectResult(redirectTarget, headers);
  return jsonResult(result.data, headers);
}

function safeRedirectTarget(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const refererUrl = new URL(referer);
    const requestUrl = new URL(request.url);
    if (refererUrl.origin !== requestUrl.origin) return "/";
    return refererUrl.toString().replace(refererUrl.origin, "");
  } catch {
    return "/";
  }
}

type MutationResult = {
  data: Record<string, unknown>;
  cartId: string | null;
  headers: Headers;
};

type GraphQLResult<D> = {
  data: D | null;
  errors?: GraphQLFormattedError[];
  headers: Headers;
};

function assertGraphQLData<D>(result: GraphQLResult<D>): NonNullable<D> {
  if (result.errors || !result.data) {
    const message = result.errors?.[0]?.message ?? "GraphQL error";
    throw new Error(message);
  }
  return result.data as NonNullable<D>;
}

function assertMutationData<D, K extends keyof NonNullable<D>>(
  result: GraphQLResult<D>,
  key: K,
): NonNullable<NonNullable<D>[K]> {
  const data = assertGraphQLData(result);
  const payload = data[key];
  if (payload == null) {
    throw new Error(`Missing ${String(key)} in mutation response`);
  }
  return payload as NonNullable<NonNullable<D>[K]>;
}

function createMutationResult(
  cart: unknown,
  userErrors: unknown,
  warnings: unknown,
  headers: Headers,
): MutationResult {
  const standardActionsCart = toStandardActionsCart(cart as Record<string, unknown> | null);

  return {
    data: { cart: standardActionsCart, userErrors, warnings },
    cartId: typeof standardActionsCart?.id === "string" ? standardActionsCart.id : null,
    headers,
  };
}

type CartMutationClient = Pick<GenericStorefrontClient, "graphql">;

async function executeMutation(
  action: CartAction,
  cartId: string | null,
  storefront: CartMutationClient,
  queries: RuntimeCartQueries,
): Promise<MutationResult> {
  if (action.intent === "add") {
    return executeAdd(action.lines, cartId, storefront, queries);
  }

  if (!cartId) {
    throw new Error("cartId is required for non-add mutations");
  }

  switch (action.intent) {
    case "update": {
      const result = await storefront.graphql(queries.cartLinesUpdate, {
        variables: { cartId, lines: action.lines },
      });
      const { cart, userErrors, warnings } = assertMutationData(result, "cartLinesUpdate");
      return createMutationResult(cart, userErrors, warnings, result.headers);
    }
    case "remove": {
      const result = await storefront.graphql(queries.cartLinesRemove, {
        variables: { cartId, lineIds: action.lineIds },
      });
      const { cart, userErrors, warnings } = assertMutationData(result, "cartLinesRemove");
      return createMutationResult(cart, userErrors, warnings, result.headers);
    }
    case "discount-update": {
      const result = await storefront.graphql(queries.cartDiscountCodesUpdate, {
        variables: { cartId, discountCodes: action.discountCodes },
      });
      const { cart, userErrors, warnings } = assertMutationData(result, "cartDiscountCodesUpdate");
      return createMutationResult(cart, userErrors, warnings, result.headers);
    }
    case "discount-apply":
      return executeDiscountModify(cartId, "apply", action.code, storefront, queries);
    case "discount-remove":
      return executeDiscountModify(cartId, "remove", action.code, storefront, queries);
    case "note-update": {
      const result = await storefront.graphql(queries.cartNoteUpdate, {
        variables: { cartId, note: action.note },
      });
      const { cart, userErrors, warnings } = assertMutationData(result, "cartNoteUpdate");
      return createMutationResult(cart, userErrors, warnings, result.headers);
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled cart action intent: ${(_exhaustive as CartAction).intent}`);
    }
  }
}

async function executeAdd(
  lines: CartLineAddInput[],
  cartId: string | null,
  storefront: CartMutationClient,
  queries: RuntimeCartQueries,
): Promise<MutationResult> {
  if (cartId) {
    const result = await storefront.graphql(queries.cartLinesAdd, {
      variables: { cartId, lines },
    });
    const { cart, userErrors, warnings } = assertMutationData(result, "cartLinesAdd");
    return createMutationResult(cart, userErrors, warnings, result.headers);
  }

  const result = await storefront.graphql(queries.cartCreate, {
    variables: { input: { lines } },
  });
  const { cart, userErrors, warnings } = assertMutationData(result, "cartCreate");
  return createMutationResult(cart, userErrors, warnings, result.headers);
}

async function executeDiscountModify(
  cartId: string,
  mode: "apply" | "remove",
  code: string,
  storefront: CartMutationClient,
  queries: RuntimeCartQueries,
): Promise<MutationResult> {
  // Read-then-write: SFAPI has no atomic discount modify endpoint, so concurrent
  // requests can overwrite each other's discount codes.
  const cartResult = await storefront.graphql(queries.cart, {
    variables: { id: cartId },
  });
  const cartData = assertGraphQLData(cartResult);

  const currentCodes: string[] = (cartData.cart?.discountCodes ?? []).map((dc) => dc.code);

  const updatedCodes =
    mode === "apply" ? [...currentCodes, code] : currentCodes.filter((c) => c !== code);

  const result = await storefront.graphql(queries.cartDiscountCodesUpdate, {
    variables: { cartId, discountCodes: updatedCodes },
  });
  const { cart, userErrors, warnings } = assertMutationData(result, "cartDiscountCodesUpdate");
  return createMutationResult(cart, userErrors, warnings, result.headers);
}

function jsonResult<TData>(data: TData, headers: HeadersInit = {}): ShopifyRouteJsonResult<TData> {
  return { type: "json", data, headers };
}

function redirectResult(location: string, headers: HeadersInit = {}): ShopifyRouteRedirectResult {
  return { type: "redirect", location, headers };
}

function errorResult(code: CartErrorCode, message: string): ShopifyRouteErrorResult<CartError> {
  return { type: "error", error: { code, message } };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
