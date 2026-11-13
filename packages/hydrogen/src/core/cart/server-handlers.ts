import type { StorefrontClient } from "../../client";
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
import type { CartAction } from "./actions";
import {
  cartBuyerIdentitySync,
  type CartBuyerIdentitySync,
  type CartBuyerIdentitySyncContext,
} from "./buyer-identity-sync";
import {
  createCartCookie,
  createExpiredCartCookie,
  createExpiredSellerCartCookie,
  createSellerCartCookie,
  getCartIdFromCookie,
  getSellerCartIdFromCookie,
  getSellerCartsFromCookie,
  isSellerHandle,
  planSellerCookieEvictions,
} from "./cookie";
import { getCartId, type CartDataFromQuery } from "./get-cart";
import type { cartQueries, CartDataForOptions, CartQueriesForOptions } from "./queries";
import { runCartAction } from "./run-cart-action";
import type { CartData } from "./state";
import { storefrontCartTransport, type StorefrontCartTransport } from "./storefront-cart-transport";
import {
  getCartTransport,
  type CartReadResult,
  type CartServerTransport,
  type CartTransport,
  type CartTransportContext,
  type CartWriteResult,
} from "./transport";
const log = getLogger("cart-api");

const CART_API_PATH = "/api/cart" as const;
const SELLER_SEARCH_PARAM = "seller";
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
  /** `sequential` when the handlers' `transport` needs the cart store to send one cart change at a time. Absent for the default Storefront API cart. */
  ordering?: "sequential";
  /**
   * The seller carts from the request's `cart-<seller>` cookies, when you pass `includeSellers: true` to handlers whose `transport` supports sellers. The handler reads the carts in parallel and leaves out carts that fail to load, no longer exist, or have no lines. Absent otherwise.
   */
  sellers?: Array<{ seller: string; cart: TCart }>;
};

/**
 * The JSON result that the cart GET handler returns. The handler sets private cache headers that keep CDNs and shared caches from storing the cart.
 *
 * @publicDocs
 */
export type CartGetResult<TCart = CartData> = ShopifyRouteJsonResult<CartGetData<TCart>>;

/**
 * Error codes that the cart handlers return. The POST handler returns `invalid_cart_request` when it can't parse a JSON request, and `missing_cart` when a JSON request changes the cart but has no cart ID. With `customerSession`, the POST handler returns `cart_mutation_failed` when a mutation fails after the handler refreshes the customer's access token.
 *
 * For a `?seller=<handle>` request, the handlers return `invalid_seller` when the handle isn't a valid myshopify.com handle, and the POST handler returns `seller_not_supported` when the handlers' cart backend has no seller carts, such as the default Storefront API cart.
 */
export type CartErrorCode =
  | "invalid_cart_request"
  | "missing_cart"
  | "cart_mutation_failed"
  | "invalid_seller"
  | "seller_not_supported";

/**
 * An error that the cart POST handler returns, with a code that identifies the failure.
 *
 * @publicDocs
 */
export interface CartError extends ShopifyRouteError {
  /** The code that identifies the failure. */
  code: CartErrorCode;
}

/**
 * The route result that the cart POST handler returns. Check `type` to tell the results apart:
 * - `json` answers a JSON request. The result's `data` holds the mutation's `cart`, `userErrors`, and `warnings`.
 * - `redirect` answers a form submission with a `303` redirect to the referring page.
 * - `error` holds a cart error with a code that identifies the failure.
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
  /**
   * Pass `true` from a page loader to add every seller cart to the response's `sellers` field. The handler then ignores the URL's `seller` search parameter and returns the home cart as `cart`. Only handlers whose `transport` supports sellers add `sellers`.
   */
  includeSellers?: boolean;
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

/** The customer session from `createCustomerSession`. The cart handlers read the customer's login state and access token from the session. */
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

/**
 * Handles GET requests to `/api/cart` for cart server handlers created with `transport`.
 *
 * A request with a `seller` search parameter returns that seller's cart from its `cart-<seller>` cookie, or an `invalid_seller` error when the handle isn't valid. Pass `includeSellers: true` to return the home cart with every seller cart in `sellers` instead, which never returns an error result.
 */
export type CartTransportGetHandler = {
  (context: CartGetHandlerContext & { includeSellers: true }): Promise<CartGetResult>;
  (context: CartGetHandlerContext): Promise<CartGetResult | ShopifyRouteErrorResult<CartError>>;
  readonly pathname: typeof CART_API_PATH;
  readonly method: typeof CART_GET_METHOD;
};

/** Handles POST requests to `/api/cart` and runs the cart change that the request body describes. */
export type CartPostHandler<TContext extends CartPostHandlerContext = CartPostHandlerContext> =
  CallableRouteHandler<TContext, CartPostResult, typeof CART_API_PATH, typeof CART_POST_METHOD>;

/**
 * The cart route handlers that `createCartServerHandlers` returns.
 *
 * Register the handlers with `handleShopifyRoutes` to serve the `/api/cart` route that the cart store calls.
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
 * The cart route handlers that `createCartServerHandlers` returns when you pass `customerSession`. The handlers connect carts to the logged-in customer.
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
  /** Returns the cart like the GET handler in `CartServerHandlers`. For a logged-in customer, the handler adds `logged_in=true` to the checkout URL. */
  get: CartGetHandler<TCart, CartGetHandlerContext & CartCustomerSessionReadContext>;
  /**
   * Runs cart changes like the POST handler in `CartServerHandlers`. When an add creates a cart for a logged-in customer, the handler attaches the customer to the new cart. When the handler refreshes the customer's access token and the mutation then fails, the handler returns a `cart_mutation_failed` error with status `500`.
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

/**
 * The cart route handlers that `createCartServerHandlers` returns when you pass `transport`.
 *
 * With a transport that supports sellers, such as `createUcpCartTransport()`, the handlers keep one cart per seller. `/api/cart?seller=<handle>` reads and changes the cart of the store at `<handle>.myshopify.com`, kept in a `cart-<handle>` cookie. Each seller cart has its own checkout.
 */
export type CartServerHandlersWithTransport = {
  /** The cart query document that the handlers run. Always `undefined`, because the transport reads carts. */
  readonly [cartServerHandlersCartQuery]: undefined;
  /** Returns the home cart, one seller's cart, or the home cart with every seller cart. */
  get: CartTransportGetHandler;
  /**
   * Runs the cart change that the request describes, like the POST handler in `CartServerHandlers`. With `?seller=<handle>`, the change runs on that seller's cart. The handler sets the seller's `cart-<handle>` cookie (`HttpOnly`, with `Max-Age` from the cart's expiry), expires it when the cart no longer exists, and expires the least recently written seller cookies when there are more than 10 or they exceed 2,048 bytes.
   */
  post: CartPostHandler;
};

/** The cart fragment option for cart server handlers. */
interface CartServerHandlersBaseOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> {
  /**
   * A cart fragment that adds fields to the cart in every cart query and mutation response.
   * Name the fragment `CartFragment` on the `Cart` type.
   *
   * `createCartServerHandlers` throws for any other fragment name or type.
   */
  readonly fragment?: TCartFragment;
  /** Leave the option out to use the Storefront API cart. */
  readonly transport?: undefined;
}

/** Options for cart server handlers that attach the logged-in customer to new carts. */
interface CartServerHandlersOptionsWithCustomerSession<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> extends CartServerHandlersBaseOptions<TCartFragment> {
  /** The customer session from `createCustomerSession`. Pass the session to attach the logged-in customer to new carts. */
  readonly customerSession: CartCustomerSession;
}

/** Options for cart server handlers without a customer session. */
interface CartServerHandlersOptionsWithoutCustomerSession<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> extends CartServerHandlersBaseOptions<TCartFragment> {
  /** Leave the option out to create carts without a customer. */
  readonly customerSession?: undefined;
}

/** Options for cart server handlers that keep the cart in another backend. */
interface CartServerHandlersOptionsWithTransport {
  /**
   * The cart backend that reads and changes carts in place of the Storefront API, such as `createUcpCartTransport()` from `@shopify/hydrogen/ucp`. The handlers return carts in the default `CartData` shape.
   *
   * `createCartServerHandlers` throws a `TypeError` when the value doesn't come from a Hydrogen transport factory, or when you combine it with `fragment` or `customerSession`.
   */
  readonly transport: CartServerTransport;
  readonly fragment?: undefined;
  readonly customerSession?: undefined;
}

/** Options for creating cart server handlers. */
export type CreateCartServerHandlersOptions<
  TCartFragment extends AnyStorefrontQueryString = AnyStorefrontQueryString,
> =
  | CartServerHandlersOptionsWithCustomerSession<TCartFragment>
  | CartServerHandlersOptionsWithoutCustomerSession<TCartFragment>
  | CartServerHandlersOptionsWithTransport;

type CartServerHandlersForOptions<TOptions> = TOptions extends {
  readonly transport: CartServerTransport;
}
  ? CartServerHandlersWithTransport
  : TOptions extends {
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
 * The handlers read the cart ID from the `cart` cookie and set the cookie when they create a cart. A JSON request gets a JSON response, and a form submission gets a `303` redirect to the referring page.
 *
 * Pass `customerSession` to connect carts to the logged-in customer. The handlers then need `sessionManager` and `requestContext` in their context.
 *
 * Pass `transport` to keep carts in another backend, such as `createUcpCartTransport()` from `@shopify/hydrogen/ucp`. A transport that supports sellers also keeps one cart per seller at `/api/cart?seller=<handle>`. Pass `includeSellers: true` to the GET handler from your root loader to get every seller cart in `sellers`.
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
 *
 * // With a cart backend from a Hydrogen transport factory
 * const cartHandlers = createCartServerHandlers({
 *   transport: createUcpCartTransport({ agentProfile }),
 * });
 * ```
 * @publicDocs
 */
export function createCartServerHandlers(): CartServerHandlers<typeof cartQueries.cart>;
export function createCartServerHandlers<const TOptions extends CreateCartServerHandlersOptions>(
  options: TOptions,
): CartServerHandlersForOptions<TOptions>;
/**
 * @param options A custom cart fragment and the customer session, or a cart transport.
 * @returns The GET and POST handlers to register with `handleShopifyRoutes`.
 */
export function createCartServerHandlers(
  options?: CreateCartServerHandlersOptions,
): CartServerHandlers | CartServerHandlersWithTransport | CartServerHandlersWithCustomerSession {
  if (options?.transport !== undefined) return createTransportHandlers(options);

  const transport = storefrontCartTransport({ fragment: options?.fragment });
  const customerSession = options?.customerSession;

  const handlers = {
    get: createCallableRouteHandler(
      CART_API_PATH,
      CART_GET_METHOD,
      (context: CartGetHandlerContext & Partial<CartCustomerSessionReadContext>) =>
        handleGet(context, transport, customerSession),
    ),
    post: createCallableRouteHandler(
      CART_API_PATH,
      CART_POST_METHOD,
      (context: CartPostHandlerContext & Partial<CartCustomerSessionWriteContext>) =>
        handlePost(context, transport, customerSession),
    ),
  };

  Object.defineProperty(handlers, cartServerHandlersCartQuery, { value: transport.cartQuery });
  if (customerSession) {
    // Symbol-keyed and non-enumerable so the capability never registers as a
    // route in handleShopifyRoutes and stays uncallable outside Hydrogen wiring.
    Object.defineProperty(handlers, cartBuyerIdentitySync, {
      value: createCartBuyerIdentitySync(transport),
    });
  }
  return handlers as CartServerHandlers | CartServerHandlersWithCustomerSession;
}

function createTransportHandlers(
  options: CreateCartServerHandlersOptions,
): CartServerHandlersWithTransport {
  if (options.fragment !== undefined || options.customerSession !== undefined) {
    throw new TypeError(
      "createCartServerHandlers can't combine transport with fragment or customerSession.",
    );
  }
  const transport = getCartTransport(options.transport);
  const handlers = {
    get: createCallableRouteHandler(
      CART_API_PATH,
      CART_GET_METHOD,
      (context: CartGetHandlerContext) => handleTransportGet(context, transport),
    ),
    post: createCallableRouteHandler(
      CART_API_PATH,
      CART_POST_METHOD,
      (context: CartPostHandlerContext) => handlePost(context, transport),
    ),
  };
  Object.defineProperty(handlers, cartServerHandlersCartQuery, { value: undefined });
  return handlers as CartServerHandlersWithTransport;
}

function createCartBuyerIdentitySync(transport: StorefrontCartTransport): CartBuyerIdentitySync {
  return {
    updateBuyerIdentity: async (
      { request, storefrontClient }: CartBuyerIdentitySyncContext,
      customerAccessToken: string | null,
    ) => {
      const cartId = getCartIdFromCookie(request);
      if (!cartId) return;
      await transport.updateBuyerIdentity(cartId, customerAccessToken, { storefrontClient });
    },
    expiredCartCookie: createExpiredCartCookie(),
  };
}

async function handleTransportGet(
  context: CartGetHandlerContext,
  transport: CartTransport,
): Promise<CartGetResult | ShopifyRouteErrorResult<CartError>> {
  if (context.includeSellers) return handleGet(context, transport);
  const seller = getSellerParam(cartSource(context).url);
  if (seller === null) return handleGet(context, transport);
  return getSellerError(seller, transport) ?? handleSellerGet(context, transport, seller);
}

async function handleGet(
  context: CartGetHandlerContext & Partial<CartCustomerSessionReadContext>,
  transport: CartTransport,
  customerSession?: CartCustomerSession,
): Promise<CartGetResult> {
  const { storefrontClient } = context;
  const source = cartSource(context);
  const cartId = getCartId(source);
  const [result, sellers] = await Promise.all([
    readCart(transport, cartId, { storefrontClient }),
    context.includeSellers && transport.sellers
      ? readSellerCarts(transport, source, storefrontClient)
      : undefined,
  ]);
  logCartErrors(result.errors);
  const cart = await addLoggedInCheckoutParam(result.cart, context, customerSession);
  return cartGetResult(
    {
      cart,
      ...(result.errors && { errors: result.errors }),
      ...orderingField(transport),
      ...(sellers && { sellers }),
    },
    result.headers,
  );
}

async function handleSellerGet(
  context: CartGetHandlerContext,
  transport: CartTransport,
  seller: string,
): Promise<CartGetResult> {
  const { storefrontClient } = context;
  const cartId = getSellerCartIdFromCookie(cartSource(context), seller);
  const result = await readCart(transport, cartId, { storefrontClient, seller });
  logCartErrors(result.errors);
  return cartGetResult(
    {
      cart: result.cart,
      ...(result.errors && { errors: result.errors }),
      ...orderingField(transport),
    },
    result.headers,
  );
}

function cartGetResult(data: CartGetData, transportHeaders: Headers): CartGetResult {
  const headers = createProxyResponseHeaders(transportHeaders);
  applyPrivateResponseCacheHeaders(headers);
  return { type: "json", data, headers };
}

function cartSource({ request, storefrontClient }: CartGetHandlerContext) {
  return request ?? storefrontClient.requestContext;
}

async function readCart(
  transport: CartTransport,
  cartId: string | null,
  ctx: CartTransportContext,
): Promise<CartReadResult> {
  if (!cartId) return { cart: null, headers: new Headers() };
  return transport.getCart({ cartId }, ctx);
}

async function readSellerCarts(
  transport: CartTransport,
  source: Request | { cookie?: string },
  storefrontClient: StorefrontClient,
): Promise<NonNullable<CartGetData["sellers"]>> {
  const results = await Promise.all(
    getSellerCartsFromCookie(source).map(async ({ seller, cartId }) => {
      try {
        const { cart, errors } = await transport.getCart({ cartId }, { storefrontClient, seller });
        logCartErrors(errors);
        return cart && cart.lines.nodes.length > 0 ? [{ seller, cart }] : [];
      } catch (error) {
        log.warn("seller cart read failed, so the response leaves the seller out", {
          seller,
          error,
        });
        return [];
      }
    }),
  );
  return results.flat();
}

function getSellerParam(url: string | undefined): string | null {
  if (!url) return null;
  return new URL(url, "https://hydrogen.local").searchParams.get(SELLER_SEARCH_PARAM);
}

function getSellerError(
  seller: string,
  transport: CartTransport,
): ShopifyRouteErrorResult<CartError> | undefined {
  if (!isSellerHandle(seller)) {
    return errorResult(
      "invalid_seller",
      "The seller must be a myshopify.com handle, such as raycon for raycon.myshopify.com.",
    );
  }
  if (!transport.sellers) {
    return errorResult("seller_not_supported", "This cart backend doesn't support seller carts.");
  }
}

function logCartErrors(errors: CartGetData["errors"]): void {
  if (!errors?.length) return;
  log.error(errors.map(({ message }) => message).join("\n"));
}

async function handlePost(
  context: CartPostHandlerContext & Partial<CartCustomerSessionWriteContext>,
  transport: CartTransport,
  customerSession?: CartCustomerSession,
): Promise<CartPostResult> {
  const seller = getSellerParam(context.request.url);
  if (seller !== null) return handleSellerPost(context, transport, seller);
  return handleHomePost(context, transport, customerSession);
}

async function handleHomePost(
  context: CartPostHandlerContext & Partial<CartCustomerSessionWriteContext>,
  transport: CartTransport,
  customerSession?: CartCustomerSession,
): Promise<CartPostResult> {
  const { request, storefrontClient } = context;
  const isFormRequest = isFormCartRequest(request);
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
    transport,
    { storefrontClient, customerAccessToken: customerAccess.accessToken },
    customerSessionHeaders,
  );
  if (result.type !== "mutation") return result.response;

  const headers = createProxyResponseHeaders(result.headers);
  appendHeaders(headers, customerSessionHeaders);

  const cartCookie = createOwnedCartCookie(cartId === cookieCartId, cookieCartId, result.cart);
  if (cartCookie) headers.append("set-cookie", cartCookie);

  if (isFormRequest) return redirectResult(redirectTarget, headers);
  const { cart, userErrors, warnings } = result;
  return jsonResult({ cart, userErrors, warnings, ...orderingField(transport) }, headers);
}

async function handleSellerPost(
  { request, storefrontClient }: CartPostHandlerContext,
  transport: CartTransport,
  seller: string,
): Promise<CartPostResult> {
  const isFormRequest = isFormCartRequest(request);
  const redirectTarget = safeRedirectTarget(request);
  const sellerError = getSellerError(seller, transport);
  if (sellerError) return isFormRequest ? redirectResult(redirectTarget) : sellerError;

  const parsedCartRequest = await parseCartAction(request, isFormRequest, redirectTarget);
  if (parsedCartRequest.type === "response") return parsedCartRequest.response;
  const { action, bodyCartId } = parsedCartRequest;
  const cookieCartId = getSellerCartIdFromCookie(request, seller);
  const cartId = bodyCartId ?? cookieCartId;
  const missingCartResponse = getMissingCartResponse(action, cartId, isFormRequest, redirectTarget);
  if (missingCartResponse) return missingCartResponse;

  const result = await runCartAction(transport, cartId, action, { storefrontClient, seller });
  const headers = createProxyResponseHeaders(result.headers);
  if (cartId === cookieCartId) {
    for (const cookie of sellerCookieUpdates(request, seller, cookieCartId, result)) {
      headers.append("set-cookie", cookie);
    }
  }

  if (isFormRequest) return redirectResult(redirectTarget, headers);
  const { cart, userErrors, warnings } = result;
  return jsonResult({ cart, userErrors, warnings, ...orderingField(transport) }, headers);
}

// Only a missing cart expires the cookie. An emptied cart keeps it, so the browser's next read
// still finds the cart.
function sellerCookieUpdates(
  request: Request,
  seller: string,
  cookieCartId: string | null,
  { cart, expiresAt }: CartWriteResult,
): string[] {
  const secure = new URL(request.url).protocol === "https:";
  if (cart === null) {
    return cookieCartId ? [createExpiredSellerCartCookie(seller, { secure })] : [];
  }
  if (typeof cart.id !== "string") return [];
  const now = Date.now();
  return [
    createSellerCartCookie(seller, cart.id, { expiresAt, secure, now }),
    ...planSellerCookieEvictions(request, seller, cart.id, now).map((evicted) =>
      createExpiredSellerCartCookie(evicted, { secure }),
    ),
  ];
}

function orderingField(transport: CartTransport): Pick<CartGetData, "ordering"> {
  return transport.ordering === "sequential" ? { ordering: "sequential" } : {};
}

function createOwnedCartCookie(
  targetsCookieCart: boolean,
  cookieCartId: string | null,
  cart: CartData | null,
): string | undefined {
  const resultCartId = typeof cart?.id === "string" ? cart.id : null;
  if (targetsCookieCart && resultCartId !== null && resultCartId !== cookieCartId) {
    return createCartCookie(resultCartId);
  }
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
  transport: CartTransport,
  transportContext: CartTransportContext,
  customerSessionHeaders: Headers | undefined,
): Promise<
  ({ type: "mutation" } & CartWriteResult) | { type: "response"; response: CartPostResult }
> {
  try {
    return {
      type: "mutation",
      ...(await runCartAction(transport, cartId, action, transportContext)),
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

function isFormCartRequest(request: Request): boolean {
  return !request.headers.get("content-type")?.includes("application/json");
}

function safeRedirectTarget(request: Request): string {
  return getSameOriginPath(request.headers.get("referer"), new URL(request.url).origin) ?? "/";
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
