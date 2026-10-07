import type { GraphQLFormattedError, StorefrontClient } from "../../client";
import type {
  CustomerSession,
  ReadonlyCustomerSessionManager,
  WritableCustomerSessionManager,
} from "../../customer-account/session";
import { getCustomerSessionRefreshResult } from "../../customer-account/session";
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
import { getSameOriginPath } from "../url";
import { parseCartRequest } from "./actions";
import type { CartAction, CartLineAddInput } from "./actions";
import {
  cartBuyerIdentitySync,
  type CartBuyerIdentitySync,
  type CartBuyerIdentitySyncContext,
} from "./buyer-identity-sync";
import { getCartIdFromCookie, createCartCookie, createExpiredCartCookie } from "./cookie";
import { getCart, getCartId, type CartDataFromQuery } from "./get-cart";
import {
  cartBuyerIdentityUpdateMutation,
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
const CART_MUTATION_FAILED_STATUS = 500;
const CART_MUTATION_FAILED_MESSAGE = "Cart mutation failed. Please try again.";
const cartServerHandlersCartQuery: unique symbol = Symbol("hydrogen.cartQuery");

/**
 * The response body that the cart GET handler returns.
 *
 * @publicDocs
 */
export type CartGetData<TCart = CartData> = {
  /** The cart, or `null` when no cart exists or the cart query returns GraphQL errors. */
  cart: TCart | null;
  /** GraphQL errors from the Storefront API cart query. The handler also logs them on the server. */
  errors?: Array<{ message: string }>;
};

/**
 * The route result that the cart GET handler returns. The handler sets private cache headers on the result.
 *
 * @publicDocs
 */
export type CartGetResult<TCart = CartData> = ShopifyRouteJsonResult<CartGetData<TCart>>;

/**
 * Error codes that the cart POST handler returns. The handler returns `invalid_cart_request` when it can't parse a JSON request and `missing_cart` when a JSON request changes a cart that doesn't exist. The handler returns `cart_mutation_failed` when a mutation fails after a customer session refresh.
 */
export type CartErrorCode = "invalid_cart_request" | "missing_cart" | "cart_mutation_failed";

/**
 * An error that the cart POST handler returns, with a code that identifies the failure.
 *
 * @publicDocs
 */
export type CartError = ShopifyRouteError & {
  code: CartErrorCode;
};

/**
 * The route result that the cart POST handler returns. The result is one of these:
 * - JSON with the mutation's cart, user errors, and warnings, for a JSON request
 * - A 303 redirect to the referring page, for a form submission
 * - A cart error with an error code
 *
 * @publicDocs
 */
export type CartPostResult =
  | ShopifyRouteJsonResult<Record<string, unknown>>
  | ShopifyRouteRedirectResult
  | ShopifyRouteErrorResult<CartError>;

type CartCustomerAccessTokenResult = {
  accessToken?: string;
  commitSession: boolean;
};

type ParsedCartRequestResult =
  | { type: "action"; action: CartAction; bodyCartId: string | null }
  | { type: "response"; response: CartPostResult };

/** Context for the cart GET handler. Without a request, the handler reads the cart ID from the client's request context. */
type CartGetHandlerContext = {
  storefrontClient: StorefrontClient;
  request?: Request;
};

/** Context for the cart POST handler: the incoming request and the Storefront API client. */
type CartPostHandlerContext = {
  request: Request;
  storefrontClient: StorefrontClient;
};

/** Session context that the GET handler requires when the handlers sync buyer identity. */
type CartCustomerSessionReadContext = {
  sessionManager: ReadonlyCustomerSessionManager;
  /** The current request's context, which the handler uses to check the customer's login state. */
  requestContext: ShopifyRequestContext;
};

/** Session context that the POST handler requires when the handlers sync buyer identity. */
type CartCustomerSessionWriteContext = {
  /** A writable session manager. The handler commits it after refreshing the customer access token. */
  sessionManager: WritableCustomerSessionManager;
  /** The current request's context, which the handler uses to read or refresh the customer access token. */
  requestContext: ShopifyRequestContext;
};

/** The customer session that supplies login state and access tokens for buyer identity sync. */
type CartCustomerSession = CustomerSession;

/** The GET handler for the `/api/cart` route. The handler fetches the current cart from the Storefront API. */
export type CartGetHandler<
  TCart = CartData,
  TContext extends CartGetHandlerContext = CartGetHandlerContext,
> = CallableRouteHandler<
  TContext,
  CartGetResult<TCart>,
  typeof CART_API_PATH,
  typeof CART_GET_METHOD
>;

/** The POST handler for the `/api/cart` route. The handler runs a cart mutation from a JSON or form data body. */
export type CartPostHandler<TContext extends CartPostHandlerContext = CartPostHandlerContext> =
  CallableRouteHandler<TContext, CartPostResult, typeof CART_API_PATH, typeof CART_POST_METHOD>;

/**
 * The GET and POST handlers for the `/api/cart` route that createCartServerHandlers returns.
 *
 * Register the handlers with handleShopifyRoutes to connect the browser cart store to the Storefront API.
 */
export type CartServerHandlers<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  /** The cart query document that the handlers run. */
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  /**
   * Reads the cart ID from the request, or from the client's request context when you omit the request, and fetches the cart. The handler logs GraphQL errors on the server and returns them in the data's errors field. The handler throws when the Storefront API request fails.
   */
  get: CartGetHandler<TCart>;
  /**
   * Parses the request and runs the matching Storefront API mutation. An add without a cart creates a cart. Other intents without a cart return a `missing_cart` error for a JSON request and a redirect for a form submission. The handler sets the `cart` cookie when the mutation returns a new cart ID, unless the request body names a cart other than the cookie's cart. The handler rethrows GraphQL and transport errors from a mutation.
   */
  post: CartPostHandler;
};

/**
 * The cart server handlers that createCartServerHandlers returns when you pass `customerSession`. The handlers sync the cart's buyer identity with the customer session.
 *
 * Each handler context requires a session manager and the request context. The handlers throw when the context lacks either one.
 */
export type CartServerHandlersWithCustomerSession<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  /** The cart query document that the handlers run. */
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  readonly [cartBuyerIdentitySync]: CartBuyerIdentitySync;
  /** Fetches the cart like the plain GET handler. For a logged-in customer, the handler adds `logged_in=true` to the checkout URL. */
  get: CartGetHandler<TCart, CartGetHandlerContext & CartCustomerSessionReadContext>;
  /**
   * Runs cart mutations like the plain POST handler. When an add creates a cart for a logged-in customer, the handler attaches the customer's access token to the new cart. When the handler refreshes the session and the mutation then fails, the handler logs the error and returns a `cart_mutation_failed` error with status 500.
   */
  post: CartPostHandler<CartPostHandlerContext & CartCustomerSessionWriteContext>;
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

/**
 * Infers the cart data shape from the type of your cart server handlers.
 *
 * Use the type to give framework components and hooks the cart fields from your custom cart query.
 *
 * @example
 * ```ts
 * type MyCartData = CartDataFromHandlers<typeof cartHandlers>;
 * ```
 */
export type CartDataFromHandlers<THandlers> = CartDataFromHandlerResult<
  CartGetHandlerResult<THandlers>
>;

/** Options for creating cart server handlers. */
export type CreateCartServerHandlersOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> = {
  /**
   * A cart fragment that the handlers spread into every cart query and mutation response.
   * Name the fragment `CartFragment` and target the `Cart` type.
   *
   * Creating the handlers throws an error for any other fragment name or type.
   */
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

/**
 * Creates the GET and POST handlers for the `/api/cart` route.
 *
 * The handlers find the cart through the `cart` cookie and run the matching Storefront API query or mutation. A JSON request gets a JSON response, and a form submission gets a 303 redirect to the referring page.
 *
 * Pass `customerSession` to sync the cart's buyer identity with the logged-in customer. The handlers then require a session manager in their context.
 *
 * @example
 * ```ts
 * // Basic setup
 * const cartHandlers = createCartServerHandlers();
 *
 * // With a custom cart fragment
 * const cartHandlers = createCartServerHandlers({
 *   fragment: CART_FRAGMENT,
 * });
 *
 * // With customer session for buyer identity sync
 * const cartHandlers = createCartServerHandlers({
 *   customerSession,
 * });
 * ```
 * @publicDocs
 */
export function createCartServerHandlers(): CartServerHandlers<typeof cartQueries.cart>;
export function createCartServerHandlers<const TOptions extends CreateCartServerHandlersOptions>(
  options: TOptions,
): CartServerHandlersForOptions<TOptions>;
/**
 * @param options The custom cart fragment and the customer session to sync with the cart.
 * @returns GET and POST handlers for the cart route to register with your framework's router.
 */
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
      (context: CartGetHandlerContext & Partial<CartCustomerSessionReadContext>) =>
        handleGet(context, runtimeQueries, customerSession),
    ),
    post: createCallableRouteHandler(
      CART_API_PATH,
      CART_POST_METHOD,
      (context: CartPostHandlerContext & Partial<CartCustomerSessionWriteContext>) =>
        handlePost(context, runtimeQueries, customerSession),
    ),
  };

  Object.defineProperty(handlers, cartServerHandlersCartQuery, { value: queries.cart });
  if (customerSession) {
    // Symbol-keyed and non-enumerable so the capability never registers as a
    // route in handleShopifyRoutes and stays uncallable outside Hydrogen wiring.
    Object.defineProperty(handlers, cartBuyerIdentitySync, {
      value: createCartBuyerIdentitySync(),
    });
  }
  return handlers as CartServerHandlers | CartServerHandlersWithCustomerSession;
}

function createCartBuyerIdentitySync(): CartBuyerIdentitySync {
  return {
    updateBuyerIdentity: updateCartBuyerIdentity,
    expiredCartCookie: createExpiredCartCookie(),
  };
}

async function updateCartBuyerIdentity(
  context: CartBuyerIdentitySyncContext,
  customerAccessToken: string | null,
): Promise<void> {
  const cartId = getCartIdFromCookie(context.request);
  if (!cartId) return;

  const result = await context.storefrontClient.graphql(cartBuyerIdentityUpdateMutation, {
    variables: { cartId, buyerIdentity: { customerAccessToken } },
  });
  const { userErrors } = assertMutationData(result, "cartBuyerIdentityUpdate");
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(({ message }) => message).join("\n"));
  }
}

type RuntimeCartQueries = typeof cartQueries;

async function handleGet(
  context: CartGetHandlerContext & Partial<CartCustomerSessionReadContext>,
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
  context: CartPostHandlerContext & Partial<CartCustomerSessionWriteContext>,
  queries: RuntimeCartQueries,
  customerSession?: CartCustomerSession,
): Promise<CartPostResult> {
  const { request, storefrontClient } = context;
  const isFormRequest = !request.headers.get("content-type")?.includes("application/json");
  const redirectTarget = safeRedirectTarget(request);

  const parsedCartRequest = await parseCartAction(request, isFormRequest, redirectTarget);
  if (parsedCartRequest.type === "response") return parsedCartRequest.response;

  const cookieCartId = getCartIdFromCookie(request);
  const cartId = parsedCartRequest.bodyCartId ?? cookieCartId;
  const missingCartResponse = getMissingCartResponse(
    parsedCartRequest.action,
    cartId,
    isFormRequest,
    redirectTarget,
  );
  if (missingCartResponse) return missingCartResponse;

  const { action } = parsedCartRequest;
  const customerAccess = await getCartCreateCustomerAccess(
    parsedCartRequest.action,
    cartId,
    context,
    customerSession,
  );
  const customerSessionHeaders = customerAccess.commitSession
    ? await getCustomerSessionHeaders(context)
    : undefined;
  const result = await executeCartMutation(
    action,
    cartId,
    storefrontClient,
    queries,
    customerAccess.accessToken,
    customerSessionHeaders,
  );
  if (result.type !== "mutation") return result.response;

  const headers = createProxyResponseHeaders(result.headers);
  appendHeaders(headers, customerSessionHeaders);

  // Only persist carts the browser already owns, including newly-created carts.
  if (cartId === cookieCartId && result.cartId !== null && result.cartId !== cookieCartId) {
    headers.append("set-cookie", createCartCookie(result.cartId));
  }

  if (isFormRequest) return redirectResult(redirectTarget, headers);
  return jsonResult(result.data, headers);
}

async function parseCartAction(
  request: Request,
  isFormRequest: boolean,
  redirectTarget: string,
): Promise<ParsedCartRequestResult> {
  try {
    const { action, cartId: bodyCartId } = await parseCartRequest(request);
    return { type: "action", action, bodyCartId };
  } catch (error) {
    if (isFormRequest) return { type: "response", response: redirectResult(redirectTarget) };
    return {
      type: "response",
      response: errorResult("invalid_cart_request", getErrorMessage(error, "Bad Request")),
    };
  }
}

function getMissingCartResponse(
  action: CartAction,
  cartId: string | null,
  isFormRequest: boolean,
  redirectTarget: string,
): CartPostResult | undefined {
  if (action.intent === "add" || cartId) return undefined;
  if (isFormRequest) return redirectResult(redirectTarget);
  return errorResult("missing_cart", "No cart exists. Add an item first.");
}

async function executeCartMutation(
  action: CartAction,
  cartId: string | null,
  storefrontClient: StorefrontClient,
  queries: RuntimeCartQueries,
  customerAccessToken: string | undefined,
  customerSessionHeaders: Headers | undefined,
): Promise<
  ({ type: "mutation" } & MutationResult) | { type: "response"; response: CartPostResult }
> {
  try {
    return {
      type: "mutation",
      ...(await executeMutation(action, cartId, storefrontClient, queries, customerAccessToken)),
    };
  } catch (error) {
    if (!customerSessionHeaders) throw error;
    log.error("cart mutation failed", { error });
    return {
      type: "response",
      response: errorResult(
        "cart_mutation_failed",
        CART_MUTATION_FAILED_MESSAGE,
        customerSessionHeaders,
        CART_MUTATION_FAILED_STATUS,
      ),
    };
  }
}

async function getCustomerSessionHeaders(
  context: Partial<CartCustomerSessionWriteContext>,
): Promise<Headers | undefined> {
  assertCustomerSessionWriteContext(context);
  const sessionHeaders = await context.sessionManager.commit?.();
  if (!sessionHeaders) return undefined;
  return new Headers(sessionHeaders);
}

function appendHeaders(headers: Headers, headersToAppend: Headers | undefined) {
  if (!headersToAppend) return;
  for (const [key, value] of headersToAppend) {
    if (key !== "set-cookie") headers.append(key, value);
  }
  for (const setCookie of headersToAppend.getSetCookie()) {
    headers.append("set-cookie", setCookie);
  }
}

function safeRedirectTarget(request: Request): string {
  return getSameOriginPath(request.headers.get("referer"), new URL(request.url).origin) ?? "/";
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
    case "attributes-update": {
      const result = await storefront.graphql(queries.cartAttributesUpdate, {
        variables: { cartId, attributes: action.attributes },
      });
      const { cart, userErrors, warnings } = assertMutationData(result, "cartAttributesUpdate");
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

async function getCartCreateCustomerAccess(
  action: CartAction,
  cartId: string | null,
  context: Partial<CartCustomerSessionWriteContext>,
  customerSession?: CartCustomerSession,
): Promise<CartCustomerAccessTokenResult> {
  if (action.intent !== "add" || cartId || !customerSession) {
    return { commitSession: false };
  }

  assertCustomerSessionWriteContext(context);
  const accessToken = await customerSession.getAccessToken(
    context.sessionManager,
    context.requestContext,
  );
  if (accessToken) return { accessToken, commitSession: false };

  const isLoggedIn = await customerSession.isLoggedIn(
    context.sessionManager,
    context.requestContext,
  );
  if (!isLoggedIn) return { commitSession: false };

  const refreshResult = await getCustomerSessionRefreshResult(
    customerSession,
    context.sessionManager,
    context.requestContext,
  );
  if (refreshResult) {
    return {
      accessToken: refreshResult.accessToken,
      commitSession: refreshResult.status !== "transient",
    };
  }

  const refreshedAccessToken = await customerSession.getOrRefreshAccessToken(
    context.sessionManager,
    context.requestContext,
  );
  return {
    accessToken: refreshedAccessToken,
    commitSession: true,
  };
}

async function addLoggedInCheckoutParam<TCart extends CartData>(
  cart: TCart | null,
  context: Partial<CartCustomerSessionReadContext>,
  customerSession?: CartCustomerSession,
): Promise<TCart | null> {
  if (!cart || !customerSession) return cart;
  assertCustomerSessionReadContext(context);
  if (!(await customerSession.isLoggedIn(context.sessionManager, context.requestContext)))
    return cart;
  if (!cart.checkoutUrl) return cart;

  const checkoutUrl = new URL(cart.checkoutUrl);
  checkoutUrl.searchParams.set("logged_in", "true");
  return { ...cart, checkoutUrl: checkoutUrl.toString() };
}

function assertCustomerSessionContext(
  context: Partial<CartCustomerSessionReadContext | CartCustomerSessionWriteContext>,
): void {
  if (context.sessionManager && context.requestContext) return;
  throw new Error(
    "Cart handlers configured with customerSession require sessionManager and requestContext.",
  );
}

function assertCustomerSessionReadContext(
  context: Partial<CartCustomerSessionReadContext>,
): asserts context is CartCustomerSessionReadContext {
  assertCustomerSessionContext(context);
}

function assertCustomerSessionWriteContext(
  context: Partial<CartCustomerSessionWriteContext>,
): asserts context is CartCustomerSessionWriteContext {
  assertCustomerSessionContext(context);
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

function errorResult(
  code: CartErrorCode,
  message: string,
  headers?: HeadersInit,
  status?: number,
): ShopifyRouteErrorResult<CartError> {
  return {
    type: "error",
    error: { code, message },
    ...(headers && { headers }),
    ...(status !== undefined && { status }),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}
