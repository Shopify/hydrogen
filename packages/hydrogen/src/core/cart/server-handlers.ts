import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type {
  CustomerSession,
  ReadonlyCustomerSessionManager,
} from "../../customer-account/session";
import type { AnyStorefrontQueryString } from "../../graphql";
import { applyPrivateResponseCacheHeaders } from "../headers";
import { getLogger } from "../logging";
import type { ShopifyRequestContext } from "../request-context";
import { createProxyResponseHeaders } from "../request-routing/interceptors/proxy";
import type {
  CallableRouteHandler,
  ShopifyRouteError,
  ShopifyRouteErrorResult,
  ShopifyRouteJsonResult,
  ShopifyRouteRedirectResult,
} from "../request-routing/registered-routes";
import { createCallableRouteHandler } from "../request-routing/registered-routes";
import { parseCartRequest } from "./actions";
import type { CartAction, CartLineAddInput } from "./actions";
import { getCartIdFromCookie, createCartCookie } from "./cookie";
import { getCart, getCartId, type CartDataFromQuery } from "./get-cart";
import {
  cartQueries,
  makeCartQueries,
  type CartDataForOptions,
  type CartQueriesForOptions,
  type CreateCartQueriesOptions,
} from "./queries";
import type { CartData } from "./state";
const log = getLogger("cart-api");

const CART_API_PATH = "/api/cart" as const;
const CART_GET_METHOD = "GET" as const;
const CART_POST_METHOD = "POST" as const;
const cartServerHandlersCartQuery: unique symbol = Symbol("hydrogen.cartQuery");

export type CartGetData<TCart = CartData> = {
  cart: TCart | null;
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
  storefrontClient: StorefrontClient;
  request?: Request;
};

type CartPostHandlerContext = {
  request: Request;
  storefrontClient: StorefrontClient;
};

type CartCustomerSessionContext = {
  sessionManager: ReadonlyCustomerSessionManager;
  requestContext: ShopifyRequestContext;
};

type CartCustomerSession = Pick<CustomerSession, "getAccessToken" | "isLoggedIn">;

export type CartGetHandler<
  TCart = CartData,
  TContext extends CartGetHandlerContext = CartGetHandlerContext,
> = CallableRouteHandler<
  TContext,
  CartGetResult<TCart>,
  typeof CART_API_PATH,
  typeof CART_GET_METHOD
>;

export type CartPostHandler<TContext extends CartPostHandlerContext = CartPostHandlerContext> =
  CallableRouteHandler<TContext, CartPostResult, typeof CART_API_PATH, typeof CART_POST_METHOD>;

export type CartServerHandlers<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  get: CartGetHandler<TCart>;
  post: CartPostHandler;
};

export type CartServerHandlersWithCustomerSession<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  get: CartGetHandler<TCart, CartGetHandlerContext & CartCustomerSessionContext>;
  post: CartPostHandler<CartPostHandlerContext & CartCustomerSessionContext>;
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
  : TResult extends { data: { cart: infer TCart } }
    ? NonNullable<TCart> extends CartData
      ? NonNullable<TCart>
      : CartData
    : CartData;

export type CartDataFromHandlers<THandlers> = CartDataFromHandlerResult<
  CartGetHandlerResult<THandlers>
>;

type CreateCartServerHandlersOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = {
  readonly fragment?: TCartFragment;
} & ({ readonly customerSession: CartCustomerSession } | { readonly customerSession?: undefined });

type CartServerHandlersForOptions<TOptions> = TOptions extends {
  readonly customerSession: CartCustomerSession;
}
  ? CartServerHandlersWithCustomerSession<
      CartQueriesForOptions<TOptions>["cart"],
      CartDataForOptions<TOptions>
    >
  : CartServerHandlers<CartQueriesForOptions<TOptions>["cart"], CartDataForOptions<TOptions>>;

export function createCartServerHandlers(): CartServerHandlers<typeof cartQueries.cart>;
export function createCartServerHandlers<const TOptions extends CreateCartServerHandlersOptions>(
  options: TOptions,
): CartServerHandlersForOptions<TOptions>;
export function createCartServerHandlers(
  options?: CreateCartServerHandlersOptions,
): CartServerHandlers | CartServerHandlersWithCustomerSession {
  const queries = options?.fragment
    ? makeCartQueries({ fragment: options.fragment } as CreateCartQueriesOptions)
    : cartQueries;
  const runtimeQueries = queries as RuntimeCartQueries;
  const customerSession = options?.customerSession;

  const handlers = {
    get: createCallableRouteHandler(
      CART_API_PATH,
      CART_GET_METHOD,
      (context: CartGetHandlerContext & Partial<CartCustomerSessionContext>) =>
        handleGet(context, runtimeQueries, customerSession),
    ),
    post: createCallableRouteHandler(
      CART_API_PATH,
      CART_POST_METHOD,
      (context: CartPostHandlerContext & Partial<CartCustomerSessionContext>) =>
        handlePost(context, runtimeQueries, customerSession),
    ),
  };

  Object.defineProperty(handlers, cartServerHandlersCartQuery, { value: queries.cart });
  return handlers as CartServerHandlers | CartServerHandlersWithCustomerSession;
}

type RuntimeCartQueries = typeof cartQueries;

async function handleGet(
  context: CartGetHandlerContext & Partial<CartCustomerSessionContext>,
  queries: RuntimeCartQueries,
  customerSession?: CartCustomerSession,
): Promise<CartGetResult> {
  const { request, storefrontClient } = context;
  const cartIdSource = request ?? storefrontClient.requestContext;
  const result = await getCart(getCartId(cartIdSource), storefrontClient, queries.cart);
  logCartErrors(result.errors);
  const cart = await addLoggedInCheckoutParam(result.cart, context, customerSession);
  const data = { cart, ...(result.errors && { errors: result.errors }) };
  const headers = createProxyResponseHeaders(result.headers);
  applyPrivateResponseCacheHeaders(headers);

  return {
    type: "json",
    data,
    headers,
  };
}

function logCartErrors(errors: CartGetData["errors"]): void {
  if (!errors?.length) return;
  log.error(errors.map(({ message }) => message).join("\n"));
}

async function handlePost(
  context: CartPostHandlerContext & Partial<CartCustomerSessionContext>,
  queries: RuntimeCartQueries,
  customerSession?: CartCustomerSession,
): Promise<CartPostResult> {
  const { request, storefrontClient } = context;
  const isFormRequest = !request.headers.get("content-type")?.includes("application/json");
  const redirectTarget = safeRedirectTarget(request);

  let action: CartAction;
  let bodyCartId: string | null;
  try {
    ({ action, cartId: bodyCartId } = await parseCartRequest(request));
  } catch (error) {
    if (isFormRequest) return redirectResult(redirectTarget);
    return errorResult("invalid_cart_request", getErrorMessage(error, "Bad Request"));
  }

  const cookieCartId = getCartIdFromCookie(request);
  const cartId = bodyCartId ?? cookieCartId;

  if (action.intent !== "add" && !cartId) {
    if (isFormRequest) return redirectResult(redirectTarget);
    return errorResult("missing_cart", "No cart exists. Add an item first.");
  }

  const customerAccessToken = await getCartCreateCustomerAccessToken(
    action,
    cartId,
    context,
    customerSession,
  );
  const result = await executeMutation(
    action,
    cartId,
    storefrontClient,
    queries,
    customerAccessToken,
  );
  const headers = createProxyResponseHeaders(result.headers);

  // Only persist carts the browser already owns, including newly-created carts.
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
  const storefrontCart = (cart ?? null) as Record<string, unknown> | null;

  return {
    data: { cart: storefrontCart, userErrors, warnings },
    cartId: typeof storefrontCart?.id === "string" ? storefrontCart.id : null,
    headers,
  };
}

type CartMutationClient = Pick<StorefrontClient, "graphql">;

async function executeMutation(
  action: CartAction,
  cartId: string | null,
  storefront: CartMutationClient,
  queries: RuntimeCartQueries,
  customerAccessToken?: string,
): Promise<MutationResult> {
  if (action.intent === "add") {
    return executeAdd(action.lines, cartId, storefront, queries, customerAccessToken);
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
  customerAccessToken?: string,
): Promise<MutationResult> {
  if (cartId) {
    const result = await storefront.graphql(queries.cartLinesAdd, {
      variables: { cartId, lines },
    });
    const { cart, userErrors, warnings } = assertMutationData(result, "cartLinesAdd");
    return createMutationResult(cart, userErrors, warnings, result.headers);
  }

  const result = await storefront.graphql(queries.cartCreate, {
    variables: {
      input: {
        lines,
        ...(customerAccessToken && { buyerIdentity: { customerAccessToken } }),
      },
    },
  });
  const { cart, userErrors, warnings } = assertMutationData(result, "cartCreate");
  return createMutationResult(cart, userErrors, warnings, result.headers);
}

async function getCustomerAccessToken(
  context: Partial<CartCustomerSessionContext>,
  customerSession?: CartCustomerSession,
): Promise<string | undefined> {
  if (!customerSession) return undefined;
  assertCustomerSessionContext(context);
  return customerSession.getAccessToken(context.sessionManager, context.requestContext);
}

async function getCartCreateCustomerAccessToken(
  action: CartAction,
  cartId: string | null,
  context: Partial<CartCustomerSessionContext>,
  customerSession?: CartCustomerSession,
): Promise<string | undefined> {
  if (action.intent !== "add" || cartId) return undefined;
  return getCustomerAccessToken(context, customerSession);
}

async function addLoggedInCheckoutParam<TCart extends CartData>(
  cart: TCart | null,
  context: Partial<CartCustomerSessionContext>,
  customerSession?: CartCustomerSession,
): Promise<TCart | null> {
  if (!cart || !customerSession) return cart;
  assertCustomerSessionContext(context);
  if (!(await customerSession.isLoggedIn(context.sessionManager, context.requestContext)))
    return cart;
  if (!cart.checkoutUrl) return cart;

  const checkoutUrl = new URL(cart.checkoutUrl);
  checkoutUrl.searchParams.set("logged_in", "true");
  return { ...cart, checkoutUrl: checkoutUrl.toString() };
}

function assertCustomerSessionContext(
  context: Partial<CartCustomerSessionContext>,
): asserts context is CartCustomerSessionContext {
  if (context.sessionManager && context.requestContext) return;
  throw new Error(
    "Cart handlers configured with customerSession require sessionManager and requestContext.",
  );
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
