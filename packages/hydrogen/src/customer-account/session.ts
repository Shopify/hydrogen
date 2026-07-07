import { DEFAULT_TIMEOUT_IN_MS } from "../core/constants";
import type { ShopifyRequestContext } from "../core/headers";
import {
  createCallableRouteHandler,
  type CallableRouteHandler,
  type ShopifyRouteErrorResult,
  type ShopifyRouteRedirectResult,
  type ShopifyRouteSessionManager,
} from "../core/route-handlers";
import { CustomerAccountApiError, CustomerAccountOAuthError } from "./errors";

export const CUSTOMER_ACCOUNT_AUTHORIZE_PATH = "/account/authorize" as const;
export const CUSTOMER_ACCOUNT_LOGIN_PATH = "/account/login" as const;
export const CUSTOMER_ACCOUNT_LOGOUT_PATH = "/account/logout" as const;
export const CUSTOMER_ACCOUNT_REFRESH_PATH = "/account/refresh" as const;

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

export type Awaitable<T> = T | Promise<T>;

/** Read-only Customer Account session storage for UI state and strict access-token reads. */
export type ReadonlyCustomerSessionManager = {
  getSessionItem(key: string): Awaitable<unknown>;
};

/** Writable Customer Account session storage for OAuth, refresh, and logout response boundaries. */
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

export type CreateCustomerSessionOptions = {
  shopId: string;
  customerAccountApiClientId: string;
  customerAccountApiUrl?: string;
  fetch?: typeof globalThis.fetch;
  defaultTimeoutInMs?: number;
};

export type PrepareLoginUrlOptions = {
  origin?: string;
  returnTo?: string;
  locale?: string;
  countryCode?: string;
  loginHint?: string;
  loginHintMode?: string;
  acrValues?: string;
};

export type RequestOriginOptions = {
  origin?: string;
};

export type LogoutOptions = RequestOriginOptions & {
  postLogoutRedirectUri?: string;
};

export type CustomerSession = {
  /**
   * Read-only signed-in check for UI state. Returns true for a usable access token
   * or a refresh token that can attempt to restore one later. Not an authorization
   * check for private Customer Account data.
   */
  isLoggedIn(
    sessionManager: ReadonlyCustomerSessionManager,
    requestContext: ShopifyRequestContext,
  ): Promise<boolean>;
  /** Returns only a currently usable access token. Does not refresh or mutate session state. */
  getAccessToken(
    sessionManager: ReadonlyCustomerSessionManager,
    requestContext: ShopifyRequestContext,
  ): Promise<string | undefined>;
  /**
   * Returns a usable access token, writing updated session state through the
   * supplied writable session manager when no usable access token is stored. Use
   * only where the eventual response commits the session manager.
   */
  getOrRefreshAccessToken(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options?: RequestOriginOptions,
  ): Promise<string | undefined>;
  prepareLoginUrl(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options: PrepareLoginUrlOptions,
  ): Promise<string>;
  handleOAuthCallback(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    request: Request,
  ): Promise<string>;
  logout(
    sessionManager: WritableCustomerSessionManager,
    requestContext: ShopifyRequestContext,
    options?: LogoutOptions,
  ): Promise<string>;
};

export type CustomerAccountServerHandlers = {
  authorize: CallableRouteHandler<
    CustomerAccountRouteHandlerContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
    "GET"
  >;
  login: CallableRouteHandler<
    CustomerAccountRouteHandlerContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_LOGIN_PATH,
    "GET"
  >;
  logout: CallableRouteHandler<
    CustomerAccountRouteHandlerContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_LOGOUT_PATH,
    "POST"
  >;
  refresh: CallableRouteHandler<
    CustomerAccountRouteHandlerContext,
    CustomerAccountRouteResult,
    typeof CUSTOMER_ACCOUNT_REFRESH_PATH,
    "GET"
  >;
};

export type CreateCustomerAccountServerHandlersOptions = {
  customerSession: CustomerSession;
  defaultPostLoginRedirectPathname?: string;
  loginFailedRedirectPath?: string;
  origin?: string | ((request: Request) => string);
  postLogoutRedirectUri?: string;
};

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
type CustomerAccountRouteResult = ShopifyRouteRedirectResult | ShopifyRouteErrorResult;
type CustomerAccountRouteHandlerContext = {
  request: Request;
  sessionManager: WritableCustomerSessionManager;
  requestContext: ShopifyRequestContext;
};
type TokenRequestParams = {
  url: string;
  origin: string;
  body: URLSearchParams;
  fetch: typeof globalThis.fetch;
  signal: AbortSignal;
};

export function createCustomerSession({
  shopId,
  customerAccountApiClientId,
  customerAccountApiUrl,
  fetch: customFetch,
  defaultTimeoutInMs = DEFAULT_TIMEOUT_IN_MS,
}: CreateCustomerSessionOptions): CustomerSession {
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
    requestContext.markResponseAsPersonalized(CUSTOMER_SESSION_ACCESS_TOKEN_PERSONALIZATION_REASON);
    const sessionData = await readSessionData(sessionManager);
    const accessToken = getUsableAccessToken(sessionData);
    if (accessToken) return accessToken;

    const refreshToken = getRefreshToken(sessionData);
    if (!refreshToken) return undefined;

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
      await writeTokens(sessionManager, refreshResult.tokens);
      return refreshResult.tokens.accessToken;
    }

    if (refreshResult.type === "invalid") {
      await clearTokens(sessionManager);
    }

    return undefined;
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

  return {
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
}

export function createCustomerAccountServerHandlers(
  options: CreateCustomerAccountServerHandlersOptions,
): CustomerAccountServerHandlers {
  const {
    customerSession,
    defaultPostLoginRedirectPathname = DEFAULT_POST_LOGIN_REDIRECT_PATHNAME,
    loginFailedRedirectPath = FAILED_LOGIN_PATH,
    postLogoutRedirectUri = DEFAULT_POST_LOGOUT_REDIRECT_URI,
  } = options;
  const { origin: originOption } = options;

  return {
    authorize: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
      "GET",
      async ({ request, sessionManager, requestContext }) => {
        return handleAuthorizeRoute(
          customerSession,
          sessionManager,
          requestContext,
          request,
          loginFailedRedirectPath,
          originOption,
        );
      },
    ),
    login: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_LOGIN_PATH,
      "GET",
      async ({ request, sessionManager, requestContext }) => {
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
      async ({ request, sessionManager, requestContext }) => {
        return handleLogoutRoute(
          customerSession,
          sessionManager,
          requestContext,
          request,
          postLogoutRedirectUri,
          originOption,
        );
      },
    ),
    refresh: createCallableRouteHandler(
      CUSTOMER_ACCOUNT_REFRESH_PATH,
      "GET",
      async ({ request, sessionManager, requestContext }) => {
        return handleRefreshRoute(
          customerSession,
          sessionManager,
          requestContext,
          request,
          originOption,
        );
      },
    ),
  };
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
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  request: Request,
  postLogoutRedirectUri: string,
  originOption: string | ((request: Request) => string) | undefined,
): Promise<CustomerAccountRouteResult> {
  const origin = await resolveRouteOrigin(sessionManager, request, originOption);
  if (!isSameOriginPost(request, origin)) return forbiddenResult();

  const requestUrl = new URL(request.url);
  const requestedReturnTo =
    requestUrl.searchParams.get("return_to") ?? requestUrl.searchParams.get("returnTo");
  const logoutUrl = await customerSession.logout(sessionManager, requestContext, {
    origin,
    postLogoutRedirectUri: sanitizeReturnTo(requestedReturnTo, origin, postLogoutRedirectUri),
  });
  return redirectResult(logoutUrl, await commitSession(sessionManager));
}

async function handleAuthorizeRoute(
  customerSession: CustomerSession,
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  request: Request,
  loginFailedRedirectPath: string,
  originOption: string | ((request: Request) => string) | undefined,
): Promise<CustomerAccountRouteResult> {
  try {
    const location = await customerSession.handleOAuthCallback(
      sessionManager,
      requestContext,
      request,
    );
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
  sessionManager: WritableCustomerSessionManager,
  requestContext: ShopifyRequestContext,
  request: Request,
  originOption: string | ((request: Request) => string) | undefined,
): Promise<CustomerAccountRouteResult> {
  const origin = await resolveRouteOrigin(sessionManager, request, originOption);
  await customerSession.getOrRefreshAccessToken(sessionManager, requestContext, { origin });

  const requestUrl = new URL(request.url);
  const returnTo =
    requestUrl.searchParams.get("return_to") ?? requestUrl.searchParams.get("returnTo");
  return redirectResult(sanitizeReturnTo(returnTo, origin), await commitSession(sessionManager));
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
}): Promise<string> {
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

  return pendingLogin.returnTo ?? DEFAULT_LOGIN_RETURN_TO_PATH;
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
  if (!returnTo) return fallbackReturnTo;

  try {
    const url = new URL(returnTo, origin);
    if (url.origin !== origin) return fallbackReturnTo;
    const sanitizedReturnTo = `${url.pathname}${url.search}${url.hash}`;
    if (new TextEncoder().encode(sanitizedReturnTo).byteLength > MAX_RETURN_TO_LENGTH_IN_BYTES) {
      return fallbackReturnTo;
    }
    return sanitizedReturnTo;
  } catch {
    return fallbackReturnTo;
  }
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
