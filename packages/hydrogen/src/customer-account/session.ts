import type { StorefrontClient } from "../client";
import {
  getCartBuyerIdentitySync,
  type CartBuyerIdentitySync,
  type CartBuyerIdentitySyncSource,
} from "../core/cart/buyer-identity-sync";
import { DEFAULT_TIMEOUT_IN_MS } from "../core/constants";
import { getLogger } from "../core/logging";
import type { ShopifyRequestContext } from "../core/request-context";
import {
  createCallableRouteHandler,
  type CallableRouteHandler,
  type ShopifyRouteErrorResult,
  type ShopifyRouteHandlerContext,
  type ShopifyRouteRedirectResult,
  type ShopifyRouteSessionManager,
} from "../core/request-routing/registered-routes";
import { CUSTOMER_ACCOUNT_PATHS, getSameOriginPath } from "../core/url";
import { CustomerAccountApiError, CustomerAccountOAuthError } from "./errors";

const log = getLogger("customer-account");

/**
 * OAuth callback route path: `"/account/authorize"`.
 *
 * @publicDocs
 */
export const CUSTOMER_ACCOUNT_AUTHORIZE_PATH = CUSTOMER_ACCOUNT_PATHS.authorize;
/**
 * Login route path: `"/account/login"`.
 *
 * @publicDocs
 */
export const CUSTOMER_ACCOUNT_LOGIN_PATH = CUSTOMER_ACCOUNT_PATHS.login;
/**
 * Logout route path: `"/account/logout"`.
 *
 * @publicDocs
 */
export const CUSTOMER_ACCOUNT_LOGOUT_PATH = CUSTOMER_ACCOUNT_PATHS.logout;
/**
 * Token refresh route path: `"/account/refresh"`.
 *
 * @publicDocs
 */
export const CUSTOMER_ACCOUNT_REFRESH_PATH = CUSTOMER_ACCOUNT_PATHS.refresh;

const CUSTOMER_ACCOUNT_SESSION_KEY = "customerAccount";
const DEFAULT_LOGIN_RETURN_TO_PATH = "/account";
const DEFAULT_POST_LOGIN_REDIRECT_PATHNAME = "/";
const DEFAULT_POST_LOGOUT_REDIRECT_URI = "/";
const FAILED_LOGIN_PATH = "/account?login=failed";
const FORBIDDEN_STATUS = 403;
const FORBIDDEN_ERROR_CODE = "forbidden";
const FORBIDDEN_ERROR_MESSAGE = "Forbidden";
const NO_STORE_CACHE_CONTROL = "no-store";
const AUTHORIZATION_CODE_GRANT_TYPE = "authorization_code";
const REFRESH_TOKEN_GRANT_TYPE = "refresh_token";
const CUSTOMER_ACCOUNT_SCOPE = "openid email customer-account-api:full";
const CODE_CHALLENGE_METHOD = "S256";
const USER_AGENT = `Hydrogen ${__HYDROGEN_VERSION__}`;
const EXPIRY_BUFFER_IN_SECONDS = 120;
const PENDING_LOGIN_TTL_IN_MINUTES = 10;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const PENDING_LOGIN_TTL_IN_MS =
  PENDING_LOGIN_TTL_IN_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const RANDOM_BYTES_LENGTH = 32;
const MAX_RETURN_TO_LENGTH_IN_BYTES = 2_048;
const MAX_SET_TIMEOUT_IN_MS = 2_147_483_647;
const SHOP_ID_RE = /^\d+$/;
const CUSTOMER_SESSION_ACCESS_TOKEN_PERSONALIZATION_REASON = "customer-session-access-token";
const CUSTOMER_SESSION_MUTATION_PERSONALIZATION_REASON = "customer-session-mutation";
const CUSTOMER_SESSION_INTERNAL_BRAND: unique symbol = Symbol("hydrogen.customerSessionInternal");

/**
 * A value or a promise for that value. Session manager methods can return either.
 */
export type Awaitable<T> = T | Promise<T>;

/** The session storage that isLoggedIn and getAccessToken read. */
export type ReadonlyCustomerSessionManager = {
  /** Returns the session value for a key. The customer session keeps its data under the `customerAccount` key. */
  getSessionItem(key: string): Awaitable<unknown>;
};

/** The session storage that sign-in, the OAuth callback, token refresh, and logout write to. Commit the session to the response after prepareLoginUrl, handleOAuthCallback, getOrRefreshAccessToken, or logout runs. */
export type WritableCustomerSessionManager = ShopifyRouteSessionManager;

type CustomerAccountSessionData = {
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
  };
  pendingLogin?: {
    state?: string;
    nonce?: string;
    codeVerifier?: string;
    returnTo?: string;
    origin?: string;
    createdAt?: number;
  };
};

/** Options for creating a customer session. */
export type CreateCustomerSessionOptions = {
  /** Numeric Shopify shop ID as a string of digits, such as `"12345"`. */
  shopId: string;
  /** The Customer Account API OAuth client ID. Must contain at least one non-whitespace character. */
  customerAccountApiClientId: string;
  /**
   * The base URL for Shopify's OAuth authorize, token, and logout endpoints. Defaults to `https://shopify.com/authentication/{shopId}`.
   *
   * The URL must use HTTPS, or creating the session throws. Sign-in fails with the `"issuer_mismatch"` code when the ID token's issuer differs from this URL.
   */
  customerAccountApiUrl?: string;
  /** A custom fetch implementation. Defaults to the global fetch. */
  fetch?: typeof globalThis.fetch;
  /** The timeout for OAuth token requests in milliseconds. Must be a positive integer no greater than 2,147,483,647. Defaults to 30,000. */
  defaultTimeoutInMs?: number;
};

/** Options for building a Shopify OAuth login URL. */
export type PrepareLoginUrlOptions = {
  /**
   * Your storefront's origin for the OAuth redirect URL. Defaults to the origin that the session manager returns.
   *
   * The origin must use HTTPS, including on localhost. Use a public HTTPS tunnel for local sign-in.
   */
  origin?: string;
  /**
   * The same-origin path or URL to send the customer to after sign-in, such as `"/account/orders"`. Defaults to `"/account"`. Cross-origin values and paths over 2,048 bytes fall back to the default.
   */
  returnTo?: string;
  /** The language for Shopify's login page, sent as the `locale` search param. */
  locale?: string;
  /** The customer's country, sent as the `region_country` search param. */
  countryCode?: string;
  /** A value that prefills Shopify's login page, such as the customer's email address, sent as the `login_hint` search param. */
  loginHint?: string;
  /** How Shopify's login page uses the login hint, such as `"submit"`, sent as the `login_hint_mode` search param. Hydrogen sends the value only with `loginHint`. */
  loginHintMode?: string;
  /** The authentication context class to request, sent as the `acr_values` search param. */
  acrValues?: string;
};

/**
 * The storefront origin for a token refresh or logout.
 */
export type RequestOriginOptions = {
  /** Your storefront's HTTPS origin. Defaults to the origin that the session manager returns. A non-HTTPS origin throws. */
  origin?: string;
};

/** Options for logging the customer out. */
export interface LogoutOptions extends RequestOriginOptions {
  /**
   * The URL to send the customer to after logout. A relative URL resolves against the origin. Defaults to the origin, and a cross-origin URL falls back to the origin.
   */
  postLogoutRedirectUri?: string;
}

/**
 * Signs customers in and out with Shopify customer accounts, and gives your server their Customer Account API access tokens. Use the session on the server only.
 *
 * Pass your session storage and the request context to each method. Each method makes the final response private and uncacheable.
 *
 * @publicDocs
 */
export type CustomerSession = {
  /**
   * Returns `true` when the customer has a usable access token or a refresh token. The method never refreshes tokens.
   *
   * Use the result for UI state, such as an account link. Gate Customer Account API data on an access token from getOrRefreshAccessToken.
   */
  isLoggedIn(
    sessionManager: ReadonlyCustomerSessionManager,
    requestContext: ShopifyRequestContext,
  ): Promise<boolean>;
  /**
   * Returns the customer's stored access token, or `undefined` when the token is missing or expired. The method never refreshes the token or writes to the session. Call getOrRefreshAccessToken to refresh an expired token.
   */
  getAccessToken(
    sessionManager: ReadonlyCustomerSessionManager,
    requestContext: ShopifyRequestContext,
  ): Promise<string | undefined>;
  /**
   * Returns a usable access token for the customer. When the stored token is missing or expired, the session gets new tokens from Shopify and writes them to your session storage. Call the method only where you commit the session to the response.
   *
   * Returns `undefined` when the customer has no refresh token, or when a temporary refresh failure keeps the session for a retry. When Shopify rejects the refresh token with a 400 or 401 status, the session clears the stored tokens and returns `undefined`. Refresh failures never throw.
   */
  getOrRefreshAccessToken(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options?: RequestOriginOptions,
  ): Promise<string | undefined>;
  /**
   * Starts customer sign-in and returns the URL of Shopify's login page. Commit the session to the response, then redirect the customer to the URL.
   *
   * The customer has 10 minutes to finish signing in. After that, the OAuth callback fails with the `"missing_pending_login"` code.
   */
  prepareLoginUrl(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: PrepareLoginUrlOptions,
  ): Promise<string>;
  /**
   * Completes sign-in from Shopify's OAuth callback request, saves the customer's tokens to your session storage, and returns the path to send the customer to. Commit the session to the response after the call.
   *
   * The method throws CustomerAccountOAuthError when sign-in fails a check, and CustomerAccountApiError when the token request times out. After a failure, the customer needs to start sign-in again.
   *
   * @throws {CustomerAccountOAuthError} When the callback parameters, pending login, token exchange, token response, or ID token claims fail validation.
   * @throws {CustomerAccountApiError} When the token request times out.
   */
  handleOAuthCallback(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    request: Request,
  ): Promise<string>;
  /**
   * Clears the customer's session data and returns the URL to send the customer to. Commit the session to the response after the call.
   *
   * When the session has an ID token, the URL points to Shopify's logout endpoint with the post-logout URL attached. Without an ID token, the method returns the post-logout URL.
   */
  logout(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options?: LogoutOptions,
  ): Promise<string>;
};

/**
 * The login, authorize, refresh, and logout routes for customer accounts. Add the object to the `handlers` option of handleShopifyRoutes.
 */
export type CustomerAccountServerHandlers<
  TContext extends CustomerAccountRouteHandlerContext = CustomerAccountRouteHandlerContext,
> = {
  /** Completes sign-in at `/account/authorize`, the OAuth callback, and redirects the customer to the return path. Accepts GET. */
  authorize: CallableRouteHandler<
    TContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
    "GET"
  >;
  /** Starts sign-in at `/account/login` and redirects the customer to Shopify's login page. Accepts GET. Pass `return_to`, `locale`, `acr_values`, `login_hint`, and `login_hint_mode` as search params. The route sends the request context's country to Shopify. */
  login: CallableRouteHandler<
    TContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_LOGIN_PATH,
    "GET"
  >;
  /**
   * Logs the customer out at `/account/logout`. Accepts POST. For CSRF protection, the route returns a 403 response unless the `Origin` or `Referer` header matches your storefront's origin.
   *
   * Through handleShopifyRoutes, a GET request to the logout path returns a 405 response. Log out with a `<form method="post" action="/account/logout">` and a submit button, which works without JavaScript.
   */
  logout: CallableRouteHandler<
    TContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_LOGOUT_PATH,
    "POST"
  >;
  /** Refreshes the access token at `/account/refresh` and redirects the customer to the same-origin `return_to` path, which defaults to `/account`. Accepts GET. */
  refresh: CallableRouteHandler<
    TContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_REFRESH_PATH,
    "GET"
  >;
};

/**
 * Customer account routes that also keep the cart's buyer identity in step with the signed-in customer. These routes need `storefrontClient` in the handler context.
 */
export type CustomerAccountServerHandlersWithCartSync =
  CustomerAccountServerHandlers<ShopifyRouteHandlerContext>;

/** A customer session that createCustomerSession returns. Cart buyer identity sync requires this session. */
type CustomerSessionWithInternals = CustomerSession & {
  readonly [CUSTOMER_SESSION_INTERNAL_BRAND]: true;
};

/** Options for the customer account routes. */
type CreateCustomerAccountServerHandlersBaseOptions = {
  /** The path to send the customer to after sign-in when the login request has no same-origin `return_to` search param. Defaults to `"/"`. */
  defaultPostLoginRedirectPathname?: string;
  /** The same-origin path to send the customer to when sign-in fails with CustomerAccountOAuthError. Defaults to `"/account?login=failed"`. A cross-origin value falls back to `"/account"`. The authorize route rethrows other errors. */
  loginFailedRedirectPath?: string;
  /** Your storefront's HTTPS origin, or a function that returns the origin for a request. Defaults to the origin that the session manager returns. */
  origin?: string | ((request: Request) => string);
  /** The URL to send the customer to after logout. Defaults to `"/"`. A same-origin `return_to` search param on the logout request overrides this value. */
  postLogoutRedirectUri?: string;
};

/** Options for the customer account routes without cart buyer identity sync. */
interface CustomerAccountServerHandlersOptionsWithoutCart extends CreateCustomerAccountServerHandlersBaseOptions {
  /** The customer session from createCustomerSession. */
  customerSession: CustomerSession;
  /**
   * The cart server handlers that createCartServerHandlers returns with its `customerSession` option. Pass the cart handlers to keep the cart's buyer identity in step with the signed-in customer.
   *
   * The authorize and refresh routes attach the customer to the cart. The logout route, and a refresh that ends the session, detach the customer from the cart. When a sync fails, the route logs the error and still redirects. When a detach fails, the route also expires the cart cookie. The sync needs `storefrontClient` in the handler context.
   *
   * Creating the handlers throws when the cart handlers lack the `customerSession` option, or when the customer session doesn't come from createCustomerSession.
   */
  cartServerHandlers?: undefined;
}

/** Options for the customer account routes that keep the cart's buyer identity in step with the signed-in customer. */
interface CustomerAccountServerHandlersOptionsWithCart extends CreateCustomerAccountServerHandlersBaseOptions {
  /** The customer session from createCustomerSession. */
  customerSession: CustomerSessionWithInternals;
  /**
   * The cart server handlers that createCartServerHandlers returns with its `customerSession` option. Pass the cart handlers to keep the cart's buyer identity in step with the signed-in customer.
   *
   * The authorize and refresh routes attach the customer to the cart. The logout route, and a refresh that ends the session, detach the customer from the cart. When a sync fails, the route logs the error and still redirects. When a detach fails, the route also expires the cart cookie. The sync needs `storefrontClient` in the handler context.
   *
   * Creating the handlers throws when the cart handlers lack the `customerSession` option, or when the customer session doesn't come from createCustomerSession.
   */
  cartServerHandlers: CartBuyerIdentitySyncSource;
}

/** Options for the customer account routes, with optional cart buyer identity sync. */
export type CreateCustomerAccountServerHandlersOptions =
  | CustomerAccountServerHandlersOptionsWithoutCart
  | CustomerAccountServerHandlersOptionsWithCart;

type CustomerAccountTokens = NonNullable<CustomerAccountSessionData["tokens"]>;
type PendingLogin = NonNullable<CustomerAccountSessionData["pendingLogin"]>;
type TokenEndpointResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
  expires_in?: unknown;
};
type ParsedTokenEndpointResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
};
type RefreshResult =
  | { type: "success"; tokens: CustomerAccountTokens }
  | { type: "invalid" }
  | { type: "transient" };
type TokenRefreshResult =
  | {
      /** A usable access token is available. */
      status: "authenticated";
      accessToken: string;
    }
  | {
      /** Refresh failed transiently, but the refreshable session remains. */
      status: "transient";
      accessToken: undefined;
    }
  | {
      /** No usable or refreshable customer session remains. */
      status: "unauthenticated";
      accessToken: undefined;
    };
type OAuthCallbackResult = {
  location: string;
  accessToken: string;
};
type CustomerSessionInternals = {
  getOrRefreshAccessToken(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options?: RequestOriginOptions,
  ): Promise<TokenRefreshResult>;
  handleOAuthCallback(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    request: Request,
  ): Promise<OAuthCallbackResult>;
};
const customerSessionInternals = new WeakMap<CustomerSession, CustomerSessionInternals>();
/** A redirect, or a 403 error when a logout request comes from another origin. */
type CustomerAccountRouteResult = ShopifyRouteRedirectResult | ShopifyRouteErrorResult;
type CustomerAccountRouteHandlerContext = {
  request: Request;
  sessionManager: WritableCustomerSessionManager;
  requestContext: ShopifyRequestContext;
};
type CustomerAccountRuntimeRouteHandlerContext = CustomerAccountRouteHandlerContext & {
  storefrontClient?: StorefrontClient;
};
type CustomerAccountServerHandlersForOptions<TOptions> = TOptions extends {
  cartServerHandlers: CartBuyerIdentitySyncSource;
}
  ? CustomerAccountServerHandlersWithCartSync
  : CustomerAccountServerHandlers;
type TokenRequestParams = {
  url: string;
  origin: string;
  body: URLSearchParams;
  fetch: typeof globalThis.fetch;
  signal: AbortSignal;
};

/**
 * Creates a customer session that signs customers in and out with Shopify customer accounts and manages their access tokens. Use the session on the server only.
 *
 * The function throws when the shop ID, client ID, API URL, or timeout is invalid, when no fetch implementation is available, and when the function runs in a browser.
 *
 * @example
 * ```ts
 * import { createCustomerSession } from '@shopify/hydrogen/customer-account';
 *
 * const customerSession = createCustomerSession({
 *   shopId: env.SHOP_ID,
 *   customerAccountApiClientId: env.CUSTOMER_ACCOUNT_API_CLIENT_ID,
 * });
 * ```
 *
 * @param options - The shop ID, the OAuth client ID, the authentication base URL, a custom fetch, and the token request timeout.
 * @returns A customer session with methods for sign-in, the OAuth callback, access tokens, and logout.
 * @throws {Error} When called in a browser, when an option fails validation, or when no fetch is available.
 * @publicDocs
 */
export function createCustomerSession({
  shopId,
  customerAccountApiClientId,
  customerAccountApiUrl,
  fetch: customFetch,
  defaultTimeoutInMs = DEFAULT_TIMEOUT_IN_MS,
}: CreateCustomerSessionOptions): CustomerSessionWithInternals {
  if (typeof document !== "undefined") {
    throw new Error(
      "Customer Account OAuth sessions cannot be used in a browser context. Use this helper from server or edge routes only.",
    );
  }

  validateShopId(shopId);
  validateCustomerAccountApiClientId(customerAccountApiClientId);
  validateTimeout(defaultTimeoutInMs);

  const fetch = customFetch ?? globalThis.fetch;
  if (typeof fetch !== "function") {
    throw new Error(
      "No fetch function available. Pass a fetch option or ensure globalThis.fetch exists.",
    );
  }

  const endpoints = createCustomerAccountEndpoints(shopId, customerAccountApiUrl);
  const refreshFlights = new Map<string, Promise<RefreshResult>>();

  async function getAccessToken(
    sessionManager: ReadonlyCustomerSessionManager,
    requestContext: ShopifyRequestContext,
  ) {
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_ACCESS_TOKEN_PERSONALIZATION_REASON);
    const accessToken = getUsableAccessToken(await readSessionData(sessionManager));
    return accessToken;
  }

  async function getOrRefreshAccessToken(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: RequestOriginOptions = {},
  ) {
    const result = await getOrRefreshAccessTokenResult(sessionManager, requestContext, options);
    return result.accessToken;
  }

  async function getOrRefreshAccessTokenResult(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: RequestOriginOptions = {},
  ): Promise<TokenRefreshResult> {
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_ACCESS_TOKEN_PERSONALIZATION_REASON);
    const sessionData = await readSessionData(sessionManager);
    const accessToken = getUsableAccessToken(sessionData);
    if (accessToken) return { status: "authenticated", accessToken };

    const refreshToken = getRefreshToken(sessionData);
    if (!refreshToken) return { status: "unauthenticated", accessToken: undefined };

    const origin = await getResolvedOrigin(sessionManager, options.origin);
    const idToken = sessionData.tokens?.idToken;
    const refreshResult = await getRefreshResult({
      refreshFlights,
      refreshToken,
      idToken,
      origin,
      endpoints,
      customerAccountApiClientId,
      fetch,
      timeoutInMs: defaultTimeoutInMs,
    });

    if (refreshResult.type === "success") {
      const refreshedAccessToken = refreshResult.tokens.accessToken;
      if (!refreshedAccessToken) {
        return { status: "transient", accessToken: undefined };
      }
      await writeTokens(sessionManager, refreshResult.tokens);
      return {
        status: "authenticated",
        accessToken: refreshedAccessToken,
      };
    }

    if (refreshResult.type === "invalid") {
      await clearTokens(sessionManager);
      return { status: "unauthenticated", accessToken: undefined };
    }

    return { status: "transient", accessToken: undefined };
  }

  async function prepareLoginUrl(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: PrepareLoginUrlOptions,
  ) {
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_MUTATION_PERSONALIZATION_REASON);
    const origin = await getResolvedOrigin(sessionManager, options.origin);
    const state = generateRandomBase64Url();
    const nonce = generateRandomBase64Url();
    const codeVerifier = generateRandomBase64Url();
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const returnTo = sanitizeReturnTo(options.returnTo, origin);
    const createdAt = Date.now();

    const sessionData = await readSessionData(sessionManager);
    await writeSessionData(sessionManager, {
      ...sessionData,
      pendingLogin: { state, nonce, codeVerifier, returnTo, origin, createdAt },
    });

    const loginUrl = new URL(endpoints.authorizeUrl);
    loginUrl.searchParams.set("client_id", customerAccountApiClientId);
    loginUrl.searchParams.set("scope", CUSTOMER_ACCOUNT_SCOPE);
    loginUrl.searchParams.set("response_type", "code");
    loginUrl.searchParams.set("redirect_uri", `${origin}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`);
    loginUrl.searchParams.set("state", state);
    loginUrl.searchParams.set("nonce", nonce);
    loginUrl.searchParams.set("code_challenge", codeChallenge);
    loginUrl.searchParams.set("code_challenge_method", CODE_CHALLENGE_METHOD);
    setOptionalLoginParams(loginUrl, options);

    return loginUrl.toString();
  }

  async function handleOAuthCallback(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    request: Request,
  ) {
    return (await handleOAuthCallbackResult(sessionManager, requestContext, request)).location;
  }

  async function handleOAuthCallbackResult(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    request: Request,
  ): Promise<OAuthCallbackResult> {
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_MUTATION_PERSONALIZATION_REASON);
    try {
      return await completeOAuthCallback({
        sessionManager,
        request,
        endpoints,
        customerAccountApiClientId,
        fetch,
        timeoutInMs: defaultTimeoutInMs,
      });
    } catch (error) {
      await clearPendingLogin(sessionManager);
      throw error;
    }
  }

  async function logout(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: LogoutOptions = {},
  ) {
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_MUTATION_PERSONALIZATION_REASON);
    const origin = await getResolvedOrigin(sessionManager, options.origin);
    const sessionData = await readSessionData(sessionManager);
    const idToken = sessionData.tokens?.idToken;
    const postLogoutRedirectUri = absoluteSameOriginUrl(
      options.postLogoutRedirectUri ?? origin,
      origin,
    );

    await sessionManager.removeSessionItem(CUSTOMER_ACCOUNT_SESSION_KEY);

    if (!idToken) return postLogoutRedirectUri;

    const logoutUrl = new URL(endpoints.logoutUrl);
    logoutUrl.searchParams.set("id_token_hint", idToken);
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
    return logoutUrl.toString();
  }

  const customerSession: CustomerSessionWithInternals = {
    [CUSTOMER_SESSION_INTERNAL_BRAND]: true,
    isLoggedIn: async (sessionManager, requestContext) => {
      requestContext.markResponseAsPersonalized(
        CUSTOMER_SESSION_ACCESS_TOKEN_PERSONALIZATION_REASON,
      );
      return hasCustomerSession(await readSessionData(sessionManager));
    },
    getAccessToken,
    getOrRefreshAccessToken,
    prepareLoginUrl,
    handleOAuthCallback,
    logout,
  };
  customerSessionInternals.set(customerSession, {
    getOrRefreshAccessToken: getOrRefreshAccessTokenResult,
    handleOAuthCallback: handleOAuthCallbackResult,
  });
  return customerSession;
}

export async function getCustomerSessionRefreshResult(
  customerSession: CustomerSession,
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  options: RequestOriginOptions = {},
): Promise<TokenRefreshResult | undefined> {
  return customerSessionInternals
    .get(customerSession)
    ?.getOrRefreshAccessToken(sessionManager, requestContext, options);
}

/**
 * Creates the customer account routes under `/account` for sign-in, the OAuth callback, token refresh, and logout. Add the returned object to the `handlers` option of handleShopifyRoutes.
 *
 * The login route redirects to Shopify's login page. The authorize and refresh routes redirect back to a same-origin path in your app. The logout route redirects to Shopify's logout endpoint when the session has an ID token, and to the post-logout URL otherwise. Each redirect commits the session and sends `cache-control: no-store`.
 *
 * Link to these paths with full-page navigation, such as a plain `<a>` link or a `<form>`. Client-side navigation components can't follow these redirects.
 *
 * @returns The login, authorize, refresh, and logout routes.
 * @publicDocs
 */
export function createCustomerAccountServerHandlers<
  const TOptions extends CreateCustomerAccountServerHandlersOptions,
>(options: TOptions): CustomerAccountServerHandlersForOptions<TOptions>;
/**
 * @param options The customer session, the redirect paths, and optional cart handlers for the account routes.
 * @returns The login, authorize, refresh, and logout routes.
 */
export function createCustomerAccountServerHandlers(
  options: CreateCustomerAccountServerHandlersOptions,
): CustomerAccountServerHandlers | CustomerAccountServerHandlersWithCartSync {
  const {
    customerSession,
    defaultPostLoginRedirectPathname = DEFAULT_POST_LOGIN_REDIRECT_PATHNAME,
    loginFailedRedirectPath = FAILED_LOGIN_PATH,
    postLogoutRedirectUri = DEFAULT_POST_LOGOUT_REDIRECT_URI,
  } = options;
  const { origin: originOption } = options;
  const cartSync = resolveCartBuyerIdentitySync(options);

  return {
    authorize: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
      "GET",
      async (context: CustomerAccountRuntimeRouteHandlerContext) => {
        return handleAuthorizeRoute(
          customerSession,
          context,
          loginFailedRedirectPath,
          originOption,
          cartSync,
        );
      },
    ),
    login: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_LOGIN_PATH,
      "GET",
      async (context: CustomerAccountRuntimeRouteHandlerContext) => {
        const { request, sessionManager, requestContext } = context;
        return handleLoginRoute(
          customerSession,
          sessionManager,
          requestContext,
          request,
          defaultPostLoginRedirectPathname,
          originOption,
        );
      },
    ),
    logout: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_LOGOUT_PATH,
      "POST",
      async (context: CustomerAccountRuntimeRouteHandlerContext) => {
        return handleLogoutRoute(
          customerSession,
          context,
          postLogoutRedirectUri,
          originOption,
          cartSync,
        );
      },
    ),
    refresh: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_REFRESH_PATH,
      "GET",
      async (context: CustomerAccountRuntimeRouteHandlerContext) => {
        return handleRefreshRoute(customerSession, context, originOption, cartSync);
      },
    ),
  };
}

function resolveCartBuyerIdentitySync(
  options: CreateCustomerAccountServerHandlersOptions,
): CartBuyerIdentitySync | undefined {
  if (!options.cartServerHandlers) return undefined;

  const cartSync = getCartBuyerIdentitySync(options.cartServerHandlers);
  if (!cartSync) {
    throw new Error(
      "cartServerHandlers must be created by createCartServerHandlers with the customerSession option.",
    );
  }
  if (!customerSessionInternals.has(options.customerSession)) {
    throw new Error(
      "Cart buyer identity sync requires the customerSession returned by createCustomerSession.",
    );
  }
  return cartSync;
}

async function handleLoginRoute(
  customerSession: CustomerSession,
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  request: Request,
  defaultPostLoginRedirectPathname: string,
  originOption: string | ((request: Request) => string) | undefined,
): Promise<CustomerAccountRouteResult> {
  const origin = await resolveRouteOrigin(sessionManager, request, originOption);
  const requestUrl = new URL(request.url);
  const defaultReturnTo = sanitizeReturnTo(
    defaultPostLoginRedirectPathname,
    origin,
    DEFAULT_POST_LOGIN_REDIRECT_PATHNAME,
  );
  const requestedReturnTo =
    requestUrl.searchParams.get("return_to") ?? requestUrl.searchParams.get("returnTo");
  const returnTo = sanitizeReturnTo(requestedReturnTo, origin, defaultReturnTo);
  const loginUrl = await customerSession.prepareLoginUrl(sessionManager, requestContext, {
    origin,
    returnTo,
    countryCode: requestContext.i18n.country,
    locale: getOptionalSearchParam(requestUrl, "locale"),
    acrValues: getOptionalSearchParam(requestUrl, "acr_values"),
    loginHint: getOptionalSearchParam(requestUrl, "login_hint"),
    loginHintMode: getOptionalSearchParam(requestUrl, "login_hint_mode"),
  });
  return redirectResult(loginUrl, await commitSession(sessionManager));
}

async function handleLogoutRoute(
  customerSession: CustomerSession,
  context: CustomerAccountRuntimeRouteHandlerContext,
  postLogoutRedirectUri: string,
  originOption: string | ((request: Request) => string) | undefined,
  cartSync: CartBuyerIdentitySync | undefined,
): Promise<CustomerAccountRouteResult> {
  const { request, sessionManager, requestContext } = context;
  const origin = await resolveRouteOrigin(sessionManager, request, originOption);
  if (!isSameOriginPost(request, origin)) return forbiddenResult();

  const requestUrl = new URL(request.url);
  const requestedReturnTo =
    requestUrl.searchParams.get("return_to") ?? requestUrl.searchParams.get("returnTo");
  const logoutUrl = await customerSession.logout(sessionManager, requestContext, {
    origin,
    postLogoutRedirectUri: sanitizeReturnTo(requestedReturnTo, origin, postLogoutRedirectUri),
  });

  // The redirect must complete even when detach fails: skipping it would leave
  // the Shopify IdP session alive after the app session is already destroyed.
  // Expiring the cart cookie is the fail-safe when the cart keeps the identity.
  let detachFailed = false;
  if (cartSync) {
    detachFailed = !(await syncCartBuyerIdentity(cartSync, context, null, "logout"));
  }
  const headers = new Headers(await commitSession(sessionManager));
  if (cartSync && detachFailed) headers.append("set-cookie", cartSync.expiredCartCookie);
  return redirectResult(logoutUrl, headers);
}

async function handleAuthorizeRoute(
  customerSession: CustomerSession,
  context: CustomerAccountRuntimeRouteHandlerContext,
  loginFailedRedirectPath: string,
  originOption: string | ((request: Request) => string) | undefined,
  cartSync: CartBuyerIdentitySync | undefined,
): Promise<CustomerAccountRouteResult> {
  const { request, sessionManager, requestContext } = context;
  try {
    if (!cartSync) {
      const location = await customerSession.handleOAuthCallback(
        sessionManager,
        requestContext,
        request,
      );
      return redirectResult(location, await commitSession(sessionManager));
    }

    const { location, accessToken } = await handleOAuthCallbackWithAccessToken(
      customerSession,
      sessionManager,
      requestContext,
      request,
    );
    // Best-effort: the customer is authenticated at this point, so a failed
    // cart sync must not turn a successful login into an error response. The
    // next refresh retries the attach.
    await syncCartBuyerIdentity(cartSync, context, accessToken, "authorize");
    return redirectResult(location, await commitSession(sessionManager));
  } catch (error) {
    if (!(error instanceof CustomerAccountOAuthError)) throw error;
    const origin = await resolveRouteOrigin(sessionManager, request, originOption);
    return redirectResult(
      sanitizeReturnTo(loginFailedRedirectPath, origin),
      await commitSession(sessionManager),
    );
  }
}

async function handleRefreshRoute(
  customerSession: CustomerSession,
  context: CustomerAccountRuntimeRouteHandlerContext,
  originOption: string | ((request: Request) => string) | undefined,
  cartSync: CartBuyerIdentitySync | undefined,
): Promise<CustomerAccountRouteResult> {
  const { request, sessionManager, requestContext } = context;
  const origin = await resolveRouteOrigin(sessionManager, request, originOption);
  if (!cartSync) {
    await customerSession.getOrRefreshAccessToken(sessionManager, requestContext, { origin });
    return refreshRedirectResult(request, origin, await commitSession(sessionManager));
  }

  const refreshResult = await getOrRefreshAccessTokenWithStatus(
    customerSession,
    sessionManager,
    requestContext,
    { origin },
  );
  // Transient refresh failures keep the refreshable session, so the cart's
  // identity is left untouched; a definitive outcome attaches or detaches it.
  let detachFailed = false;
  if (refreshResult.status !== "transient") {
    const customerAccessToken = refreshResult.accessToken ?? null;
    const syncSucceeded = await syncCartBuyerIdentity(
      cartSync,
      context,
      customerAccessToken,
      "refresh",
    );
    detachFailed = customerAccessToken === null && !syncSucceeded;
  }

  const headers = new Headers(await commitSession(sessionManager));
  if (detachFailed) headers.append("set-cookie", cartSync.expiredCartCookie);
  return refreshRedirectResult(request, origin, headers);
}

function refreshRedirectResult(
  request: Request,
  origin: string,
  headers?: HeadersInit,
): ShopifyRouteRedirectResult {
  const requestUrl = new URL(request.url);
  const returnTo =
    requestUrl.searchParams.get("return_to") ?? requestUrl.searchParams.get("returnTo");
  return redirectResult(sanitizeReturnTo(returnTo, origin), headers);
}

async function handleOAuthCallbackWithAccessToken(
  customerSession: CustomerSession,
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  request: Request,
): Promise<OAuthCallbackResult> {
  const internal = customerSessionInternals.get(customerSession);
  if (!internal) {
    throw new Error("Customer session was not created by createCustomerSession");
  }
  return internal.handleOAuthCallback(sessionManager, requestContext, request);
}

async function getOrRefreshAccessTokenWithStatus(
  customerSession: CustomerSession,
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  options: RequestOriginOptions,
): Promise<TokenRefreshResult> {
  const internal = customerSessionInternals.get(customerSession);
  if (!internal) {
    throw new Error("Customer session was not created by createCustomerSession");
  }
  return internal.getOrRefreshAccessToken(sessionManager, requestContext, options);
}

async function syncCartBuyerIdentity(
  cartSync: CartBuyerIdentitySync,
  context: CustomerAccountRuntimeRouteHandlerContext,
  customerAccessToken: string | null,
  route: "authorize" | "refresh" | "logout",
): Promise<boolean> {
  try {
    if (!context.storefrontClient) {
      throw new Error(
        "Customer Account handlers configured with cartServerHandlers require storefrontClient.",
      );
    }
    await cartSync.updateBuyerIdentity(
      { request: context.request, storefrontClient: context.storefrontClient },
      customerAccessToken,
    );
    return true;
  } catch (error) {
    log.error("cart buyer identity sync failed", { route, error });
    return false;
  }
}

async function resolveRouteOrigin(
  sessionManager: WritableCustomerSessionManager,
  request: Request,
  originOption: string | ((request: Request) => string) | undefined,
) {
  if (typeof originOption === "function") return normalizeOrigin(originOption(request));
  return getResolvedOrigin(sessionManager, originOption);
}

async function getResolvedOrigin(
  sessionManager: WritableCustomerSessionManager,
  originOverride: string | undefined,
) {
  return normalizeOrigin(originOverride ?? (await sessionManager.getSessionOrigin()));
}

function getOptionalSearchParam(url: URL, name: string): string | undefined {
  return url.searchParams.get(name) ?? undefined;
}

function redirectResult(location: string, headers?: HeadersInit): ShopifyRouteRedirectResult {
  const redirectHeaders = new Headers(headers);
  redirectHeaders.set("cache-control", NO_STORE_CACHE_CONTROL);
  return { type: "redirect", location, headers: redirectHeaders };
}

function forbiddenResult(): ShopifyRouteErrorResult {
  return {
    type: "error",
    status: FORBIDDEN_STATUS,
    error: { code: FORBIDDEN_ERROR_CODE, message: FORBIDDEN_ERROR_MESSAGE },
    headers: { "cache-control": NO_STORE_CACHE_CONTROL },
  };
}

async function commitSession(
  sessionManager: WritableCustomerSessionManager,
): Promise<HeadersInit | undefined> {
  return (await sessionManager.commit?.()) ?? undefined;
}

async function completeOAuthCallback({
  sessionManager,
  request,
  endpoints,
  customerAccountApiClientId,
  fetch,
  timeoutInMs,
}: {
  sessionManager: WritableCustomerSessionManager;
  request: Request;
  endpoints: CustomerAccountEndpoints;
  customerAccountApiClientId: string;
  fetch: typeof globalThis.fetch;
  timeoutInMs: number;
}): Promise<OAuthCallbackResult> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const sessionData = await readSessionData(sessionManager);
  const pendingLogin = getPendingLogin(sessionData);

  assertOAuthCallbackParams(code, state, pendingLogin);

  const origin = pendingLogin.origin ?? getOriginFromRequest(request);
  const tokenResponse = await exchangeAuthorizationCode({
    endpoints,
    customerAccountApiClientId,
    origin,
    code,
    codeVerifier: pendingLogin.codeVerifier,
    fetch,
    timeoutInMs,
  });
  validateIdTokenClaims(tokenResponse.id_token, {
    audience: customerAccountApiClientId,
    issuer: endpoints.issuer,
    nonce: pendingLogin.nonce,
  });

  await writeSessionData(sessionManager, {
    tokens: createTokensFromResponse(tokenResponse),
  });

  return {
    location: pendingLogin.returnTo ?? DEFAULT_LOGIN_RETURN_TO_PATH,
    accessToken: tokenResponse.access_token,
  };
}

function isSameOriginPost(request: Request, trustedOrigin: string): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return normalizeOrigin(origin) === trustedOrigin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (!referer) return false;

  try {
    return normalizeOrigin(new URL(referer).origin) === trustedOrigin;
  } catch {
    return false;
  }
}

function assertOAuthCallbackParams(
  code: string | null,
  state: string | null,
  pendingLogin: Required<PendingLogin>,
): asserts code is string {
  if (!code || !state) {
    throw new CustomerAccountOAuthError(
      "missing_callback_params",
      "OAuth callback is missing code or state",
    );
  }

  if (pendingLogin.state !== state) {
    throw new CustomerAccountOAuthError(
      "state_mismatch",
      "OAuth callback state does not match session state",
    );
  }
}

async function exchangeAuthorizationCode({
  endpoints,
  customerAccountApiClientId,
  origin,
  code,
  codeVerifier,
  fetch,
  timeoutInMs,
}: {
  endpoints: CustomerAccountEndpoints;
  customerAccountApiClientId: string;
  origin: string;
  code: string;
  codeVerifier: string;
  fetch: typeof globalThis.fetch;
  timeoutInMs: number;
}): Promise<Required<ParsedTokenEndpointResponse>> {
  const body = new URLSearchParams({
    grant_type: AUTHORIZATION_CODE_GRANT_TYPE,
    client_id: customerAccountApiClientId,
    redirect_uri: `${origin}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`,
    code,
    code_verifier: codeVerifier,
  });
  return withTokenRequestTimeout(timeoutInMs, async (signal) => {
    const response = await postTokenRequest({
      url: endpoints.tokenUrl,
      origin,
      body,
      fetch,
      signal,
    });

    if (!response.ok) {
      cancelResponseBody(response);
      const errorCode =
        response.status === 400 || response.status === 401
          ? "token_exchange_rejected"
          : "token_exchange_failed";
      throw new CustomerAccountOAuthError(
        errorCode,
        `Customer Account OAuth token exchange failed with ${response.status}`,
      );
    }

    return parseRequiredTokenResponse(await readTokenResponseJson(response, signal));
  });
}

async function getRefreshResult({
  refreshFlights,
  refreshToken,
  idToken,
  origin,
  endpoints,
  customerAccountApiClientId,
  fetch,
  timeoutInMs,
}: {
  refreshFlights: Map<string, Promise<RefreshResult>>;
  refreshToken: string;
  idToken: string | undefined;
  origin: string;
  endpoints: CustomerAccountEndpoints;
  customerAccountApiClientId: string;
  fetch: typeof globalThis.fetch;
  timeoutInMs: number;
}) {
  const flightKey = `${origin}\n${refreshToken}`;
  const existingFlight = refreshFlights.get(flightKey);
  if (existingFlight) return existingFlight;

  const flight = refreshAccessToken({
    endpoints,
    customerAccountApiClientId,
    refreshToken,
    idToken,
    origin,
    fetch,
    timeoutInMs,
  });
  refreshFlights.set(flightKey, flight);

  try {
    return await flight;
  } finally {
    refreshFlights.delete(flightKey);
  }
}

async function refreshAccessToken({
  endpoints,
  customerAccountApiClientId,
  refreshToken,
  idToken,
  origin,
  fetch,
  timeoutInMs,
}: {
  endpoints: CustomerAccountEndpoints;
  customerAccountApiClientId: string;
  refreshToken: string;
  idToken: string | undefined;
  origin: string;
  fetch: typeof globalThis.fetch;
  timeoutInMs: number;
}): Promise<RefreshResult> {
  const body = new URLSearchParams({
    grant_type: REFRESH_TOKEN_GRANT_TYPE,
    client_id: customerAccountApiClientId,
    refresh_token: refreshToken,
  });

  try {
    return await withTokenRequestTimeout(timeoutInMs, async (signal) => {
      const response = await postTokenRequest({
        url: endpoints.tokenUrl,
        origin,
        body,
        fetch,
        signal,
      });
      return readRefreshResult(response, refreshToken, idToken, signal);
    });
  } catch {
    return { type: "transient" };
  }
}

async function readRefreshResult(
  response: Response,
  currentRefreshToken: string,
  currentIdToken: string | undefined,
  signal: AbortSignal,
): Promise<RefreshResult> {
  if (response.status === 400 || response.status === 401) {
    cancelResponseBody(response);
    return { type: "invalid" };
  }

  if (!response.ok) {
    cancelResponseBody(response);
    return { type: "transient" };
  }

  try {
    const tokenResponse = await readTokenResponseJson(response, signal);
    const parsedTokenResponse = parseRefreshTokenResponse(tokenResponse);
    return {
      type: "success",
      tokens: createTokensFromResponse({
        ...parsedTokenResponse,
        refresh_token: parsedTokenResponse.refresh_token ?? currentRefreshToken,
        id_token: parsedTokenResponse.id_token ?? currentIdToken,
      }),
    };
  } catch {
    return { type: "transient" };
  }
}

async function postTokenRequest({
  url,
  origin,
  body,
  fetch,
  signal,
}: TokenRequestParams): Promise<Response> {
  return await withAbort(
    fetch(url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Origin: origin,
      }),
      body,
      cache: "no-store",
      redirect: "manual",
      signal,
    }),
    signal,
  );
}

async function withTokenRequestTimeout<T>(
  timeoutInMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(
      new CustomerAccountApiError(
        `Customer Account OAuth request timed out after ${timeoutInMs}ms`,
      ),
    );
  }, timeoutInMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

function withAbort<T>(promise: T | Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(getAbortReason(signal));

  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(getAbortReason(signal));
    };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function getAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("signal is aborted without reason", "AbortError");
}

async function readTokenResponseJson(
  response: Response,
  signal: AbortSignal,
): Promise<TokenEndpointResponse> {
  const json = await withAbort(response.json(), signal);
  if (!isObjectRecord(json)) {
    throw new CustomerAccountOAuthError(
      "invalid_token_response",
      "Customer Account OAuth response must be an object",
    );
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    id_token: json.id_token,
    expires_in: json.expires_in,
  };
}

function parseRequiredTokenResponse(
  response: TokenEndpointResponse,
): Required<ParsedTokenEndpointResponse> {
  const parsed = parseRefreshTokenResponse(response);
  if (typeof response.refresh_token !== "string" || response.refresh_token === "") {
    throw new CustomerAccountOAuthError(
      "invalid_token_response",
      "Customer Account OAuth response is missing refresh_token",
    );
  }

  if (typeof response.id_token !== "string" || response.id_token === "") {
    throw new CustomerAccountOAuthError(
      "invalid_token_response",
      "Customer Account OAuth response is missing id_token",
    );
  }
  return { ...parsed, refresh_token: response.refresh_token, id_token: response.id_token };
}

function parseRefreshTokenResponse(response: TokenEndpointResponse): ParsedTokenEndpointResponse {
  if (typeof response.access_token !== "string" || response.access_token === "") {
    throw new CustomerAccountOAuthError(
      "invalid_token_response",
      "Customer Account OAuth response is missing access_token",
    );
  }

  if (
    typeof response.expires_in !== "number" ||
    !Number.isFinite(response.expires_in) ||
    response.expires_in <= 0
  ) {
    throw new CustomerAccountOAuthError(
      "invalid_token_response",
      "Customer Account OAuth response is missing expires_in",
    );
  }

  return {
    access_token: response.access_token,
    refresh_token:
      typeof response.refresh_token === "string" && response.refresh_token !== ""
        ? response.refresh_token
        : undefined,
    id_token:
      typeof response.id_token === "string" && response.id_token !== ""
        ? response.id_token
        : undefined,
    expires_in: response.expires_in,
  };
}

function createTokensFromResponse(response: ParsedTokenEndpointResponse): CustomerAccountTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    idToken: response.id_token,
    expiresAt:
      Date.now() + (response.expires_in - EXPIRY_BUFFER_IN_SECONDS) * MILLISECONDS_PER_SECOND,
  };
}

function validateIdTokenClaims(
  idToken: string,
  expected: { audience: string; issuer: string; nonce: string },
): void {
  const claims = parseJwtPayload(idToken);
  if (claims.nonce !== expected.nonce) {
    throw new CustomerAccountOAuthError(
      "nonce_mismatch",
      "OAuth id_token nonce does not match session nonce",
    );
  }

  if (claims.iss !== expected.issuer) {
    throw new CustomerAccountOAuthError(
      "issuer_mismatch",
      "OAuth id_token issuer does not match Customer Account issuer",
    );
  }

  if (!hasAudienceClaim(claims.aud, expected.audience)) {
    throw new CustomerAccountOAuthError(
      "audience_mismatch",
      "OAuth id_token audience does not match Customer Account client ID",
    );
  }

  if (
    typeof claims.exp !== "number" ||
    claims.exp <= Math.floor(Date.now() / MILLISECONDS_PER_SECOND)
  ) {
    throw new CustomerAccountOAuthError("expired_id_token", "OAuth id_token is expired");
  }
}

function parseJwtPayload(idToken: string): Record<string, unknown> {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) throw new Error("Missing JWT payload");

    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    if (!isObjectRecord(decodedPayload)) throw new Error("JWT payload must be an object");

    return decodedPayload;
  } catch (cause) {
    throw new CustomerAccountOAuthError(
      "invalid_id_token",
      "Customer Account OAuth id_token is invalid",
      { cause },
    );
  }
}

function hasAudienceClaim(audience: unknown, expectedAudience: string): boolean {
  if (audience === expectedAudience) return true;
  if (!Array.isArray(audience)) return false;
  return audience.includes(expectedAudience);
}

async function readSessionData(
  sessionManager: ReadonlyCustomerSessionManager,
): Promise<CustomerAccountSessionData> {
  const value = await sessionManager.getSessionItem(CUSTOMER_ACCOUNT_SESSION_KEY);
  return isCustomerAccountSessionData(value) ? value : {};
}

async function writeSessionData(
  sessionManager: WritableCustomerSessionManager,
  sessionData: CustomerAccountSessionData,
): Promise<void> {
  await sessionManager.setSessionItem(CUSTOMER_ACCOUNT_SESSION_KEY, sessionData);
}

async function writeTokens(
  sessionManager: WritableCustomerSessionManager,
  tokens: CustomerAccountTokens,
): Promise<void> {
  const sessionData = await readSessionData(sessionManager);
  await writeSessionData(sessionManager, { ...sessionData, tokens });
}

async function clearTokens(sessionManager: WritableCustomerSessionManager): Promise<void> {
  const sessionData = await readSessionData(sessionManager);
  const { pendingLogin } = sessionData;
  if (pendingLogin) {
    await writeSessionData(sessionManager, { pendingLogin });
    return;
  }

  await sessionManager.removeSessionItem(CUSTOMER_ACCOUNT_SESSION_KEY);
}

async function clearPendingLogin(sessionManager: WritableCustomerSessionManager): Promise<void> {
  const sessionData = await readSessionData(sessionManager);
  const { tokens } = sessionData;
  if (tokens) {
    await writeSessionData(sessionManager, { tokens });
    return;
  }

  await sessionManager.removeSessionItem(CUSTOMER_ACCOUNT_SESSION_KEY);
}

function getUsableAccessToken(sessionData: CustomerAccountSessionData): string | undefined {
  const tokens = sessionData.tokens;
  if (!isTokenUsable(tokens)) return undefined;
  return tokens.accessToken;
}

function hasCustomerSession(sessionData: CustomerAccountSessionData): boolean {
  return (
    getUsableAccessToken(sessionData) !== undefined || getRefreshToken(sessionData) !== undefined
  );
}

function getRefreshToken(sessionData: CustomerAccountSessionData): string | undefined {
  const refreshToken = sessionData.tokens?.refreshToken;
  return typeof refreshToken === "string" && refreshToken !== "" ? refreshToken : undefined;
}

function getPendingLogin(sessionData: CustomerAccountSessionData): Required<PendingLogin> {
  const pendingLogin = sessionData.pendingLogin;
  if (isPendingLoginReady(pendingLogin)) return pendingLogin;
  throw new CustomerAccountOAuthError(
    "missing_pending_login",
    "OAuth callback has no pending login state",
  );
}

function isTokenUsable(
  tokens: CustomerAccountSessionData["tokens"],
): tokens is Required<CustomerAccountTokens> {
  if (!tokens || typeof tokens.accessToken !== "string" || tokens.accessToken === "") return false;
  if (typeof tokens.expiresAt !== "number") return false;
  return tokens.expiresAt > Date.now();
}

function isPendingLoginReady(
  pendingLogin: PendingLogin | undefined,
): pendingLogin is Required<PendingLogin> {
  if (!pendingLogin) return false;
  if (!isNonEmptyString(pendingLogin.state)) return false;
  if (!isNonEmptyString(pendingLogin.nonce)) return false;
  if (!isNonEmptyString(pendingLogin.codeVerifier)) return false;
  if (!isNonEmptyString(pendingLogin.returnTo)) return false;
  if (!isNonEmptyString(pendingLogin.origin)) return false;
  if (typeof pendingLogin.createdAt !== "number") return false;
  return Date.now() - pendingLogin.createdAt <= PENDING_LOGIN_TTL_IN_MS;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

function isCustomerAccountSessionData(value: unknown): value is CustomerAccountSessionData {
  if (!isObjectRecord(value) || Array.isArray(value)) return false;
  const tokens = value.tokens;
  const pendingLogin = value.pendingLogin;
  if (tokens !== undefined && (!isObjectRecord(tokens) || Array.isArray(tokens))) return false;
  return (
    pendingLogin === undefined || (isObjectRecord(pendingLogin) && !Array.isArray(pendingLogin))
  );
}

function setOptionalLoginParams(loginUrl: URL, options: PrepareLoginUrlOptions): void {
  if (options.locale) loginUrl.searchParams.set("locale", options.locale);
  if (options.countryCode) loginUrl.searchParams.set("region_country", options.countryCode);
  if (options.acrValues) loginUrl.searchParams.set("acr_values", options.acrValues);
  if (!options.loginHint) return;

  loginUrl.searchParams.set("login_hint", options.loginHint);
  if (options.loginHintMode) loginUrl.searchParams.set("login_hint_mode", options.loginHintMode);
}

function sanitizeReturnTo(
  returnTo: string | null | undefined,
  origin: string,
  fallbackReturnTo = DEFAULT_LOGIN_RETURN_TO_PATH,
): string {
  const path = getSameOriginPath(returnTo, origin);
  if (!path || new TextEncoder().encode(path).byteLength > MAX_RETURN_TO_LENGTH_IN_BYTES) {
    return fallbackReturnTo;
  }
  return path;
}

function absoluteSameOriginUrl(url: string, origin: string): string {
  const parsedUrl = new URL(url, origin);
  if (parsedUrl.origin !== origin) return origin;
  return parsedUrl.toString();
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(digest)));
}

function generateRandomBase64Url(): string {
  const bytes = new Uint8Array(RANDOM_BYTES_LENGTH);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(String.fromCharCode(...bytes));
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return atob(base64.padEnd(base64.length + paddingLength, "="));
}

type CustomerAccountEndpoints = {
  authorizeUrl: string;
  tokenUrl: string;
  logoutUrl: string;
  issuer: string;
};

function createCustomerAccountEndpoints(
  shopId: string,
  customerAccountApiUrl: string | undefined,
): CustomerAccountEndpoints {
  const authBaseUrl = normalizeAuthBaseUrl(
    customerAccountApiUrl ?? `https://shopify.com/authentication/${shopId}`,
  );
  return {
    authorizeUrl: `${authBaseUrl}/oauth/authorize`,
    tokenUrl: `${authBaseUrl}/oauth/token`,
    logoutUrl: `${authBaseUrl}/logout`,
    issuer: authBaseUrl,
  };
}

function normalizeAuthBaseUrl(customerAccountApiUrl: string): string {
  const url = new URL(customerAccountApiUrl);
  if (url.protocol !== "https:") {
    throw new Error("customerAccountApiUrl must use HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

function getOriginFromRequest(request: Request): string {
  return normalizeOrigin(new URL(request.url).origin);
}

function normalizeOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol === "https:") return url.origin;
  throw new Error(
    "Customer Account OAuth origin must use HTTPS. Use a public HTTPS tunnel for local Customer Account login.",
  );
}

function cancelResponseBody(response: Response): void {
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {}
}

function validateShopId(shopId: string): void {
  if (!SHOP_ID_RE.test(shopId)) {
    throw new Error("shopId must be a numeric Shopify shop ID string");
  }
}

function validateCustomerAccountApiClientId(customerAccountApiClientId: string): void {
  if (typeof customerAccountApiClientId !== "string" || customerAccountApiClientId.trim() === "") {
    throw new Error("customerAccountApiClientId is required");
  }
}

function validateTimeout(timeoutInMs: number): void {
  if (
    !Number.isSafeInteger(timeoutInMs) ||
    timeoutInMs <= 0 ||
    timeoutInMs > MAX_SET_TIMEOUT_IN_MS
  ) {
    throw new Error(
      `defaultTimeoutInMs must be a positive safe integer no greater than ${MAX_SET_TIMEOUT_IN_MS}`,
    );
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
