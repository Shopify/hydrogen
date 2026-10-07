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
  /** The cart, or `null` when the request has no cart ID, the cart doesn't exist, or the cart query returns GraphQL errors. */
  cart: TCart | null;
  /** GraphQL errors from the cart query. The handler also logs the errors on the server. */
  errors?: Array<{ message: string }>;
};

/**
 * The JSON result that the cart GET handler returns. The handler sets private cache headers that keep CDNs and shared caches from storing the cart.
 *
 * @publicDocs
 */
export type CartGetResult<TCart = CartData> = ShopifyRouteJsonResult<CartGetData<TCart>>;

/**
 * Error codes that the cart POST handler returns. The handler returns `invalid_cart_request` when it can't parse a JSON request, and `missing_cart` when a JSON request changes the cart but has no cart ID. With `customerSession`, the handler returns `cart_mutation_failed` when a mutation fails after the handler refreshes the customer's access token.
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

/** The context that you pass to the cart GET handler. */
type CartGetHandlerContext = {
  /** The Storefront API client that runs the cart query. */
  storefrontClient: StorefrontClient;
  /** The incoming request. Omit the request to read the cart ID from the Storefront API client's request context. */
  request?: Request;
};

/** The context that you pass to the cart POST handler. */
type CartPostHandlerContext = {
  /** The cart request, with a JSON, URL-encoded form, or multipart form body. */
  request: Request;
  /** The Storefront API client that runs the cart mutation. */
  storefrontClient: StorefrontClient;
};

/** The extra context that the GET handler needs when you create the handlers with `customerSession`. */
type CartCustomerSessionReadContext = {
  /** The session storage that holds the customer's tokens. */
  sessionManager: ReadonlyCustomerSessionManager;
  /** The current request's context, for checking the customer's login state. */
  requestContext: ShopifyRequestContext;
};

/** The extra context that the POST handler needs when you create the handlers with `customerSession`. */
type CartCustomerSessionWriteContext = {
  /** The session storage that holds the customer's tokens. After a token refresh, the handler commits the session and adds its `Set-Cookie` headers to the response. */
  sessionManager: WritableCustomerSessionManager;
  /** The current request's context, for reading or refreshing the customer's access token. */
  requestContext: ShopifyRequestContext;
};

/** The customer session from createCustomerSession. The cart handlers read the customer's login state and access token from the session. */
type CartCustomerSession = CustomerSession;

/** Handles GET requests to `/api/cart` and returns the current cart. */
export type CartGetHandler<
  TCart = CartData,
  TContext extends CartGetHandlerContext = CartGetHandlerContext,
> = CallableRouteHandler<
  TContext,
  CartGetResult<TCart>,
  typeof CART_API_PATH,
  typeof CART_GET_METHOD
>;

/** Handles POST requests to `/api/cart` and runs the cart change that the request body describes. */
export type CartPostHandler<TContext extends CartPostHandlerContext = CartPostHandlerContext> =
  CallableRouteHandler<TContext, CartPostResult, typeof CART_API_PATH, typeof CART_POST_METHOD>;

/**
 * The cart route handlers that createCartServerHandlers returns.
 *
 * Register the handlers with handleShopifyRoutes to serve the `/api/cart` route that the cart store calls.
 */
export type CartServerHandlers<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  /** The cart query document that the handlers run. */
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  /**
   * Returns the current cart. The handler reads the cart ID from the request's `cartId` search parameter or `cart` cookie. Without a request, the handler reads the cart ID from the Storefront API client's request context.
   *
   * GraphQL errors return a `null` cart with the errors in the response body. The handler throws when the Storefront API request fails.
   */
  get: CartGetHandler<TCart>;
  /**
   * Runs the cart change that the request describes and returns the updated cart. An add without a cart creates a cart and sets the `cart` cookie. Other changes without a cart return a `missing_cart` error for a JSON request and a redirect for a form submission.
   *
   * When a JSON body names a cart other than the cookie's cart, the handler leaves the cookie unchanged. The handler throws GraphQL and network errors from the mutation.
   */
  post: CartPostHandler;
};

/**
 * The cart route handlers that createCartServerHandlers returns when you pass `customerSession`. The handlers connect carts to the logged-in customer.
 *
 * Pass `sessionManager` and `requestContext` in each handler's context. A handler throws when it reads the customer session and either value is missing.
 */
export type CartServerHandlersWithCustomerSession<
  TCartQuery extends AnyStorefrontQueryString = typeof cartQueries.cart,
  TCart extends CartData = CartDataFromQuery<TCartQuery>,
> = {
  /** The cart query document that the handlers run. */
  readonly [cartServerHandlersCartQuery]: TCartQuery | undefined;
  readonly [cartBuyerIdentitySync]: CartBuyerIdentitySync;
  /** Returns the cart like the GET handler in CartServerHandlers. For a logged-in customer, the handler adds `logged_in=true` to the checkout URL. */
  get: CartGetHandler<TCart, CartGetHandlerContext & CartCustomerSessionReadContext>;
  /**
   * Runs cart changes like the POST handler in CartServerHandlers. When an add creates a cart for a logged-in customer, the handler attaches the customer to the new cart. When the handler refreshes the customer's access token and the mutation then fails, the handler returns a `cart_mutation_failed` error with status 500.
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
 * Gets the cart data type from the type of your cart server handlers, including the fields from your custom cart fragment.
 *
 * Pass `typeof cartHandlers` to type cart data in your own components and functions.
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
   * A cart fragment that adds fields to the cart in every cart query and mutation response.
   * Name the fragment `CartFragment` on the `Cart` type.
   *
   * createCartServerHandlers throws for any other fragment name or type.
   */
  readonly fragment?: TCartFragment;
} & (
  | {
      /** The customer session from createCustomerSession. Pass the session to attach the logged-in customer to new carts. */
      readonly customerSession: CartCustomerSession;
    }
  | { readonly customerSession?: undefined }
);

type CartServerHandlersForOptions<TOptions> = TOptions extends {
  readonly customerSession: CartCustomerSession;
}
  ? CartServerHandlersWithCustomerSession<
      CartQueriesForOptions<TOptions>["cart"],
      CartDataForOptions<TOptions>
    >
  : CartServerHandlers<CartQueriesForOptions<TOptions>["cart"], CartDataForOptions<TOptions>>;

/**
 * Creates the handlers for the `/api/cart` route, which loads and changes the customer's cart.
 *
 * The handlers read the cart ID from the `cart` cookie and set the cookie when they create a cart. A JSON request gets a JSON response, and a form submission gets a 303 redirect to the referring page.
 *
 * Pass `customerSession` to connect carts to the logged-in customer. The handlers then need `sessionManager` and `requestContext` in their context.
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
 * @param options A custom cart fragment and the customer session.
 * @returns The GET and POST handlers to register with handleShopifyRoutes.
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
