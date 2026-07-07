import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../client/client";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "../core/handle-shopify-routes";
import { createShopifyRequestContext } from "../core/headers";
import {
  createCustomerAccountServerHandlers,
  createCustomerSession,
  CUSTOMER_ACCOUNT_AUTHORIZE_PATH,
  CUSTOMER_ACCOUNT_LOGIN_PATH,
  CUSTOMER_ACCOUNT_LOGOUT_PATH,
  CUSTOMER_ACCOUNT_REFRESH_PATH,
  CustomerAccountOAuthError,
  type WritableCustomerSessionManager,
} from "./index";

const SHOP_ID = "123456789";
const CUSTOMER_ACCOUNT_API_CLIENT_ID = "shp_test-client-id";
const AUTH_BASE_URL = `https://shopify.com/authentication/${SHOP_ID}`;
const ORIGIN = "https://example.com";
const SESSION_KEY = "customerAccount";
const ACCESS_TOKEN = "access-token";
const REFRESH_TOKEN = "refresh-token";
const NEW_ACCESS_TOKEN = "new-access-token";
const NEW_REFRESH_TOKEN = "new-refresh-token";
const NOW_IN_MS = 1_800_000_000_000;
const ONE_HOUR_IN_SECONDS = 3_600;
const MILLISECONDS_PER_SECOND = 1_000;
const ONE_HOUR_IN_MS = ONE_HOUR_IN_SECONDS * MILLISECONDS_PER_SECOND;
const SECONDS_PER_MINUTE = 60;
const PENDING_LOGIN_TTL_IN_MINUTES = 10;
const PENDING_LOGIN_TTL_IN_MS =
  PENDING_LOGIN_TTL_IN_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const EXPIRY_BUFFER_IN_MS = 120_000;
const REFRESHED_EXPIRES_AT = NOW_IN_MS + ONE_HOUR_IN_MS - EXPIRY_BUFFER_IN_MS;
const UNICODE_OVERSIZED_RETURN_TO_CHARACTER_COUNT = 500;
const ID_TOKEN = createIdToken("expected-nonce");

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

class TestSessionManager implements WritableCustomerSessionManager {
  readonly commits: Headers[] = [];
  readonly setCalls: Array<{ key: string; value: unknown }> = [];
  readonly removeCalls: string[] = [];
  #items = new Map<string, unknown>();
  #origin: string;

  constructor(initialData?: CustomerAccountSessionData, origin = ORIGIN) {
    if (initialData) this.#items.set(SESSION_KEY, initialData);
    this.#origin = origin;
  }

  get data() {
    return this.#items.get(SESSION_KEY) as CustomerAccountSessionData | undefined;
  }

  getSessionItem(key: string) {
    return this.#items.get(key);
  }

  getSessionOrigin() {
    return this.#origin;
  }

  setSessionItem(key: string, value: unknown) {
    this.#items.set(key, value);
    this.setCalls.push({ key, value });
  }

  removeSessionItem(key: string) {
    this.#items.delete(key);
    this.removeCalls.push(key);
  }

  commit() {
    const headers = new Headers({ "Set-Cookie": `session=${this.commits.length + 1}` });
    this.commits.push(headers);
    return headers;
  }
}

function createSession(overrides: Partial<Parameters<typeof createCustomerSession>[0]> = {}) {
  return createCustomerSession({
    shopId: SHOP_ID,
    customerAccountApiClientId: CUSTOMER_ACCOUNT_API_CLIENT_ID,
    fetch: vi.fn(),
    ...overrides,
  });
}

function validSessionData(overrides: CustomerAccountSessionData = {}): CustomerAccountSessionData {
  return {
    ...overrides,
    tokens: {
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      idToken: ID_TOKEN,
      expiresAt: NOW_IN_MS + ONE_HOUR_IN_MS,
      ...overrides.tokens,
    },
  };
}

function tokenResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      access_token: NEW_ACCESS_TOKEN,
      refresh_token: NEW_REFRESH_TOKEN,
      id_token: ID_TOKEN,
      expires_in: ONE_HOUR_IN_SECONDS,
      ...overrides,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function validPendingLogin(
  overrides: NonNullable<CustomerAccountSessionData["pendingLogin"]> = {},
) {
  return {
    state: "stored-state",
    nonce: "expected-nonce",
    codeVerifier: "stored-code-verifier",
    returnTo: "/account",
    origin: ORIGIN,
    createdAt: NOW_IN_MS,
    ...overrides,
  };
}

function getFetchBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0];
  return new URLSearchParams(String((init as RequestInit).body));
}

function getFetchHeaders(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0];
  return new Headers((init as RequestInit).headers);
}

function createIdToken(nonce: string, overrides: Record<string, unknown> = {}) {
  const header = base64UrlEncode(JSON.stringify({ alg: "none" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      aud: CUSTOMER_ACCOUNT_API_CLIENT_ID,
      exp: Math.floor((NOW_IN_MS + ONE_HOUR_IN_MS) / 1_000),
      iss: AUTH_BASE_URL,
      nonce,
      ...overrides,
    }),
  );
  return `${header}.${payload}.signature`;
}

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function expectedCodeChallenge(codeVerifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const bytes = String.fromCharCode(...new Uint8Array(digest));
  return base64UrlEncode(bytes);
}

function createRequestContext(request = new Request(ORIGIN)) {
  return createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
}

function createPrivateStorefrontClient(request: Request) {
  const requestContext = createRequestContext(request);
  return createStorefrontClient({
    type: "private",
    requestContext,
    config: {
      storeDomain: "test-store.myshopify.com",
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handleShopifyRoutes(
  options: Omit<
    Parameters<typeof handleShopifyRoutesImpl>[0],
    "requestContext" | "storefrontClient"
  > & {
    requestContext?: Parameters<typeof handleShopifyRoutesImpl>[0]["requestContext"];
  },
) {
  const storefrontClient = createPrivateStorefrontClient(options.request);
  return handleShopifyRoutesImpl({
    ...options,
    requestContext: options.requestContext ?? storefrontClient.requestContext,
    storefrontClient,
  });
}

describe("createCustomerSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW_IN_MS);
  });

  it("throws when created in a browser context", () => {
    vi.stubGlobal("document", {});
    try {
      expect(() => createSession()).toThrow("browser context");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("gets usable access tokens through a read-only session manager", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager(validSessionData());
    const requestContext = createRequestContext();

    await expect(customerSession.getAccessToken(sessionManager, requestContext)).resolves.toBe(
      ACCESS_TOKEN,
    );
    await expect(customerSession.isLoggedIn(sessionManager, requestContext)).resolves.toBe(true);

    const headers = new Headers({ "cache-control": "public, s-maxage=600" });
    requestContext.applyResponseHeaders(headers);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(sessionManager.setCalls).toEqual([]);
    expect(sessionManager.removeCalls).toEqual([]);
  });

  it("treats sessions with refresh tokens as logged in without returning expired access tokens", async () => {
    const customerSession = createSession();
    const requestContext = createRequestContext();
    const missingToken = new TestSessionManager();
    const expiredAccessToken = new TestSessionManager(
      validSessionData({ tokens: { accessToken: ACCESS_TOKEN, expiresAt: NOW_IN_MS } }),
    );
    const expiredAccessTokenWithoutRefreshToken = new TestSessionManager(
      validSessionData({
        tokens: { accessToken: ACCESS_TOKEN, refreshToken: undefined, expiresAt: NOW_IN_MS },
      }),
    );

    await expect(
      customerSession.getAccessToken(missingToken, requestContext),
    ).resolves.toBeUndefined();
    await expect(customerSession.isLoggedIn(missingToken, requestContext)).resolves.toBe(false);
    await expect(
      customerSession.getAccessToken(expiredAccessToken, requestContext),
    ).resolves.toBeUndefined();
    await expect(customerSession.isLoggedIn(expiredAccessToken, requestContext)).resolves.toBe(
      true,
    );
    await expect(
      customerSession.isLoggedIn(expiredAccessTokenWithoutRefreshToken, requestContext),
    ).resolves.toBe(false);

    const headers = new Headers({ "cache-control": "public, s-maxage=600" });
    requestContext.applyResponseHeaders(headers);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(missingToken.setCalls).toEqual([]);
    expect(expiredAccessToken.setCalls).toEqual([]);
    expect(expiredAccessToken.removeCalls).toEqual([]);
    expect(expiredAccessTokenWithoutRefreshToken.setCalls).toEqual([]);
    expect(expiredAccessTokenWithoutRefreshToken.removeCalls).toEqual([]);
  });

  it("returns the existing access token when it is outside the refresh buffer", async () => {
    const fetchMock = vi.fn();
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(validSessionData());

    await expect(
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext()),
    ).resolves.toBe(ACCESS_TOKEN);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionManager.setCalls).toEqual([]);
  });

  it("refreshes near-expired tokens and stores the buffered expiry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(
      validSessionData({ tokens: { expiresAt: NOW_IN_MS } }),
    );

    await expect(
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext()),
    ).resolves.toBe(NEW_ACCESS_TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${AUTH_BASE_URL}/oauth/token`);
    expect(getFetchHeaders(fetchMock).get("Origin")).toBe(ORIGIN);
    expect(getFetchHeaders(fetchMock).get("User-Agent")).toBeTruthy();
    expect(Object.fromEntries(getFetchBody(fetchMock))).toEqual({
      grant_type: "refresh_token",
      client_id: CUSTOMER_ACCOUNT_API_CLIENT_ID,
      refresh_token: REFRESH_TOKEN,
    });
    expect(sessionManager.data?.tokens).toEqual({
      accessToken: NEW_ACCESS_TOKEN,
      refreshToken: NEW_REFRESH_TOKEN,
      idToken: ID_TOKEN,
      expiresAt: REFRESHED_EXPIRES_AT,
    });
  });

  it("single-flights concurrent refreshes by refresh token and origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(
      validSessionData({ tokens: { expiresAt: NOW_IN_MS } }),
    );

    const [firstToken, secondToken] = await Promise.all([
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext(), {
        origin: ORIGIN,
      }),
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext(), {
        origin: ORIGIN,
      }),
    ]);

    expect(firstToken).toBe(NEW_ACCESS_TOKEN);
    expect(secondToken).toBe(NEW_ACCESS_TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears only durable tokens when Shopify definitively rejects the refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("invalid", { status: 401 }));
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(
      validSessionData({
        tokens: { expiresAt: NOW_IN_MS },
        pendingLogin: { state: "pending-state", nonce: "pending-nonce" },
      }),
    );

    await expect(
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext(), {
        origin: ORIGIN,
      }),
    ).resolves.toBeUndefined();

    expect(sessionManager.data).toEqual({
      pendingLogin: { state: "pending-state", nonce: "pending-nonce" },
    });
  });

  it("preserves tokens for transient refresh failures", async () => {
    const initialData = validSessionData({ tokens: { expiresAt: NOW_IN_MS } });
    const fetchMock = vi.fn().mockResolvedValue(new Response("try later", { status: 503 }));
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(initialData);

    await expect(
      customerSession.getOrRefreshAccessToken(sessionManager, createRequestContext(), {
        origin: ORIGIN,
      }),
    ).resolves.toBeUndefined();

    expect(sessionManager.data).toEqual(initialData);
  });

  it("aborts timed-out refresh requests and preserves tokens", async () => {
    const defaultTimeoutInMs = 10;
    const initialData = validSessionData({ tokens: { expiresAt: NOW_IN_MS } });
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const customerSession = createSession({ fetch: fetchMock, defaultTimeoutInMs });
    const sessionManager = new TestSessionManager(initialData);

    const tokenPromise = customerSession.getOrRefreshAccessToken(
      sessionManager,
      createRequestContext(),
      { origin: ORIGIN },
    );
    await vi.advanceTimersByTimeAsync(defaultTimeoutInMs);

    await expect(tokenPromise).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(sessionManager.data).toEqual(initialData);
  });

  it("aborts timed-out refresh response parsing and preserves tokens", async () => {
    const defaultTimeoutInMs = 10;
    const initialData = validSessionData({ tokens: { expiresAt: NOW_IN_MS } });
    const response = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => new Promise<unknown>(() => {}),
    } as Response;
    const fetchMock = vi.fn().mockResolvedValue(response);
    const customerSession = createSession({ fetch: fetchMock, defaultTimeoutInMs });
    const sessionManager = new TestSessionManager(initialData);

    const tokenPromise = customerSession.getOrRefreshAccessToken(
      sessionManager,
      createRequestContext(),
      { origin: ORIGIN },
    );
    await vi.advanceTimersByTimeAsync(defaultTimeoutInMs);

    await expect(tokenPromise).resolves.toBeUndefined();
    expect(sessionManager.data).toEqual(initialData);
  });

  it("prepares Shopify login URLs with pending state, PKCE, and optional login parameters", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager();

    const loginUrl = await customerSession.prepareLoginUrl(sessionManager, createRequestContext(), {
      returnTo: "/orders?cursor=abc",
      locale: "fr-CA",
      countryCode: "CA",
      loginHint: "buyer@example.com",
      loginHintMode: "visual_only",
      acrValues: "urn:shopify:customer-account:verified-email",
    });

    const url = new URL(loginUrl);
    const pendingLogin = sessionManager.data?.pendingLogin;
    expect(url.origin + url.pathname).toBe(`${AUTH_BASE_URL}/oauth/authorize`);
    expect(url.searchParams.get("client_id")).toBe(CUSTOMER_ACCOUNT_API_CLIENT_ID);
    expect(url.searchParams.get("scope")).toBe("openid email customer-account-api:full");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`,
    );
    expect(url.searchParams.get("locale")).toBe("fr-CA");
    expect(url.searchParams.get("region_country")).toBe("CA");
    expect(url.searchParams.get("login_hint")).toBe("buyer@example.com");
    expect(url.searchParams.get("login_hint_mode")).toBe("visual_only");
    expect(url.searchParams.get("acr_values")).toBe("urn:shopify:customer-account:verified-email");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(pendingLogin?.returnTo).toBe("/orders?cursor=abc");
    expect(pendingLogin?.origin).toBe(ORIGIN);
    expect(url.searchParams.get("state")).toBe(pendingLogin?.state);
    expect(url.searchParams.get("nonce")).toBe(pendingLogin?.nonce);
    expect(url.searchParams.get("code_challenge")).toBe(
      await expectedCodeChallenge(pendingLogin?.codeVerifier ?? ""),
    );
  });

  it("sanitizes unsafe login return targets", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager();

    await customerSession.prepareLoginUrl(sessionManager, createRequestContext(), {
      returnTo: "https://attacker.example/phish",
    });

    expect(sessionManager.data?.pendingLogin?.returnTo).toBe("/account");
  });

  it("falls back when login return targets are too large to persist safely", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager();
    const oversizedReturnTo = `/${"😀".repeat(UNICODE_OVERSIZED_RETURN_TO_CHARACTER_COUNT)}`;

    await customerSession.prepareLoginUrl(sessionManager, createRequestContext(), {
      returnTo: oversizedReturnTo,
    });

    expect(sessionManager.data?.pendingLogin?.returnTo).toBe("/account");
  });

  it("handles OAuth callbacks, validates nonce, stores tokens, and clears pending login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse({ id_token: ID_TOKEN }));
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager({
      pendingLogin: validPendingLogin(),
    });
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=stored-state`,
    );

    await expect(
      customerSession.handleOAuthCallback(sessionManager, createRequestContext(request), request),
    ).resolves.toBe("/account");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries(getFetchBody(fetchMock))).toEqual({
      grant_type: "authorization_code",
      client_id: CUSTOMER_ACCOUNT_API_CLIENT_ID,
      redirect_uri: `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}`,
      code: "code-123",
      code_verifier: "stored-code-verifier",
    });
    expect(sessionManager.data).toEqual({
      tokens: {
        accessToken: NEW_ACCESS_TOKEN,
        refreshToken: NEW_REFRESH_TOKEN,
        idToken: ID_TOKEN,
        expiresAt: REFRESHED_EXPIRES_AT,
      },
    });
  });

  it("rejects mismatched OAuth state and clears only the pending login", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager(
      validSessionData({
        pendingLogin: validPendingLogin(),
      }),
    );
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=wrong-state`,
    );

    await expect(
      customerSession.handleOAuthCallback(sessionManager, createRequestContext(request), request),
    ).rejects.toThrow(CustomerAccountOAuthError);
    expect(sessionManager.data).toEqual({ tokens: validSessionData().tokens });
  });

  it("rejects nonce mismatch and clears only the pending login", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(tokenResponse({ id_token: createIdToken("wrong-nonce") }));
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(
      validSessionData({
        pendingLogin: validPendingLogin(),
      }),
    );
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=stored-state`,
    );

    await expect(
      customerSession.handleOAuthCallback(sessionManager, createRequestContext(request), request),
    ).rejects.toThrow(CustomerAccountOAuthError);
    expect(sessionManager.data).toEqual({ tokens: validSessionData().tokens });
  });

  it("rejects ID token audience mismatch and clears only the pending login", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        tokenResponse({ id_token: createIdToken("expected-nonce", { aud: "wrong-client" }) }),
      );
    const customerSession = createSession({ fetch: fetchMock });
    const sessionManager = new TestSessionManager(
      validSessionData({
        pendingLogin: validPendingLogin(),
      }),
    );
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=stored-state`,
    );

    await expect(
      customerSession.handleOAuthCallback(sessionManager, createRequestContext(request), request),
    ).rejects.toThrow(CustomerAccountOAuthError);
    expect(sessionManager.data).toEqual({ tokens: validSessionData().tokens });
  });

  it("rejects stale pending OAuth login state", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager(
      validSessionData({
        pendingLogin: validPendingLogin({ createdAt: NOW_IN_MS - PENDING_LOGIN_TTL_IN_MS - 1 }),
      }),
    );
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=stored-state`,
    );

    await expect(
      customerSession.handleOAuthCallback(sessionManager, createRequestContext(request), request),
    ).rejects.toThrow(CustomerAccountOAuthError);
    expect(sessionManager.data).toEqual({ tokens: validSessionData().tokens });
  });

  it("logs out by clearing Customer Account state and returning Shopify logout URL", async () => {
    const customerSession = createSession();
    const sessionManager = new TestSessionManager(validSessionData());

    await expect(
      customerSession.logout(sessionManager, createRequestContext(), {
        postLogoutRedirectUri: "/goodbye",
      }),
    ).resolves.toBe(
      `${AUTH_BASE_URL}/logout?id_token_hint=${encodeURIComponent(ID_TOKEN)}&post_logout_redirect_uri=${encodeURIComponent(`${ORIGIN}/goodbye`)}`,
    );

    expect(sessionManager.data).toBeUndefined();
    expect(sessionManager.removeCalls).toEqual([SESSION_KEY]);
  });
});

describe("createCustomerAccountServerHandlers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW_IN_MS);
  });

  it("exposes literal route metadata", () => {
    const handlers = createCustomerAccountServerHandlers({
      customerSession: createSession(),
    });

    expect(handlers.authorize.pathname).toBe(CUSTOMER_ACCOUNT_AUTHORIZE_PATH);
    expect(handlers.authorize.method).toBe("GET");
    expect(handlers.login.pathname).toBe(CUSTOMER_ACCOUNT_LOGIN_PATH);
    expect(handlers.login.method).toBe("GET");
    expect(handlers.logout.pathname).toBe(CUSTOMER_ACCOUNT_LOGOUT_PATH);
    expect(handlers.logout.method).toBe("POST");
    expect(handlers.refresh.pathname).toBe(CUSTOMER_ACCOUNT_REFRESH_PATH);
    expect(handlers.refresh.method).toBe("GET");
  });

  it("starts login, commits pending state, and redirects to Shopify", async () => {
    const sessionManager = new TestSessionManager();
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_LOGIN_PATH}?return_to=/products?handle=snowboard`,
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
          defaultPostLoginRedirectPathname: "/account",
        }),
      ],
    });

    const location = response?.headers.get("location");
    expect(response?.status).toBe(303);
    expect(response?.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(response?.headers.get("set-cookie")).toBe("session=1");
    expect(location).toContain(`${AUTH_BASE_URL}/oauth/authorize`);
    expect(sessionManager.data?.pendingLogin?.returnTo).toBe("/products?handle=snowboard");
  });

  it("sanitizes login return_to and falls back to the configured default", async () => {
    const sessionManager = new TestSessionManager();
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_LOGIN_PATH}?return_to=https://evil.test`,
    );

    await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
          defaultPostLoginRedirectPathname: "/account",
        }),
      ],
    });

    expect(sessionManager.data?.pendingLogin?.returnTo).toBe("/account");
  });

  it("forwards optional login params to Shopify", async () => {
    const sessionManager = new TestSessionManager();
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_LOGIN_PATH}?acr_values=urn:test&login_hint=taylor%40example.com&login_hint_mode=read_only&locale=fr-CA`,
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    const location = response?.headers.get("location");
    expect(location).toBeTruthy();
    const loginUrl = new URL(location ?? ORIGIN);
    expect(loginUrl.searchParams.get("region_country")).toBe("US");
    expect(loginUrl.searchParams.get("acr_values")).toBe("urn:test");
    expect(loginUrl.searchParams.get("login_hint")).toBe("taylor@example.com");
    expect(loginUrl.searchParams.get("login_hint_mode")).toBe("read_only");
    expect(loginUrl.searchParams.get("locale")).toBe("fr-CA");
  });

  it("logs out, commits cleared state, and redirects through Shopify", async () => {
    const sessionManager = new TestSessionManager(validSessionData());
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, {
      method: "POST",
      headers: { origin: ORIGIN },
    });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
          postLogoutRedirectUri: "/",
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(response?.headers.get("location")).toBe(
      `${AUTH_BASE_URL}/logout?id_token_hint=${encodeURIComponent(ID_TOKEN)}&post_logout_redirect_uri=${encodeURIComponent(`${ORIGIN}/`)}`,
    );
    expect(response?.headers.get("set-cookie")).toBe("session=1");
    expect(sessionManager.data).toBeUndefined();
  });

  it("uses same-origin logout return_to when provided", async () => {
    const sessionManager = new TestSessionManager(validSessionData());
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}?return_to=/EN-CA/account`,
      {
        method: "POST",
        headers: { origin: ORIGIN },
      },
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
          postLogoutRedirectUri: "/",
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(
      `${AUTH_BASE_URL}/logout?id_token_hint=${encodeURIComponent(ID_TOKEN)}&post_logout_redirect_uri=${encodeURIComponent(`${ORIGIN}/EN-CA/account`)}`,
    );
  });

  it("sanitizes logout return_to and falls back to the configured redirect", async () => {
    const sessionManager = new TestSessionManager(validSessionData());
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}?return_to=https://evil.test`,
      {
        method: "POST",
        headers: { origin: ORIGIN },
      },
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
          postLogoutRedirectUri: "/account",
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(
      `${AUTH_BASE_URL}/logout?id_token_hint=${encodeURIComponent(ID_TOKEN)}&post_logout_redirect_uri=${encodeURIComponent(`${ORIGIN}/account`)}`,
    );
  });

  it("returns 403 for cross-origin logout posts without mutating the session", async () => {
    const initialSessionData = validSessionData();
    const sessionManager = new TestSessionManager(initialSessionData);
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, {
      method: "POST",
      headers: { origin: "https://evil.test" },
    });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    expect(response?.status).toBe(403);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(sessionManager.data).toBe(initialSessionData);
    expect(sessionManager.commits).toHaveLength(0);
  });

  it("checks logout posts against the resolved Customer Account origin", async () => {
    const publicOrigin = "https://public.example";
    const sessionManager = new TestSessionManager(validSessionData(), publicOrigin);
    const request = new Request(`https://internal.example${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, {
      method: "POST",
      headers: { origin: publicOrigin },
    });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(
      `${AUTH_BASE_URL}/logout?id_token_hint=${encodeURIComponent(ID_TOKEN)}&post_logout_redirect_uri=${encodeURIComponent(`${publicOrigin}/`)}`,
    );
  });

  it("allows logout posts with a same-origin referer when the origin header is absent", async () => {
    const sessionManager = new TestSessionManager(validSessionData());
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, {
      method: "POST",
      headers: { referer: `${ORIGIN}/account` },
    });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    expect(response?.status).toBe(303);
    expect(sessionManager.data).toBeUndefined();
  });

  it("returns 403 for cross-origin referers when the origin header is absent", async () => {
    const initialSessionData = validSessionData();
    const sessionManager = new TestSessionManager(initialSessionData);
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, {
      method: "POST",
      headers: { referer: "https://evil.test/phish" },
    });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    expect(response?.status).toBe(403);
    expect(sessionManager.data).toBe(initialSessionData);
    expect(sessionManager.commits).toHaveLength(0);
  });

  it("returns 403 when logout posts have no origin or referer", async () => {
    const initialSessionData = validSessionData();
    const sessionManager = new TestSessionManager(initialSessionData);
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_LOGOUT_PATH}`, { method: "POST" });

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [createCustomerAccountServerHandlers({ customerSession: createSession() })],
    });

    expect(response?.status).toBe(403);
    expect(sessionManager.data).toBe(initialSessionData);
    expect(sessionManager.commits).toHaveLength(0);
  });

  it("authorizes callbacks, commits session headers, and redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse({ id_token: ID_TOKEN }));
    const sessionManager = new TestSessionManager({
      pendingLogin: validPendingLogin(),
    });
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=stored-state`,
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession({ fetch: fetchMock }),
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/account`);
    expect(response?.headers.get("set-cookie")).toBe("session=1");
  });

  it("refreshes tokens, commits session headers, and redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());
    const sessionManager = new TestSessionManager(
      validSessionData({ tokens: { expiresAt: NOW_IN_MS } }),
    );
    const request = new Request(`${ORIGIN}${CUSTOMER_ACCOUNT_REFRESH_PATH}?return_to=/account`);

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession({ fetch: fetchMock }),
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/account`);
    expect(response?.headers.get("set-cookie")).toBe("session=1");
    expect(sessionManager.data?.tokens?.accessToken).toBe(NEW_ACCESS_TOKEN);
  });

  it("passes through unrelated routes", async () => {
    const request = new Request(`${ORIGIN}/products`);

    const response = await handleShopifyRoutes({
      request,
      sessionManager: new TestSessionManager(),
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
        }),
      ],
    });

    expect(response).toBeNull();
  });

  it("redirects expected OAuth failures to the failed-login page and commits cleared state", async () => {
    const sessionManager = new TestSessionManager({
      pendingLogin: validPendingLogin(),
    });
    const request = new Request(
      `${ORIGIN}${CUSTOMER_ACCOUNT_AUTHORIZE_PATH}?code=code-123&state=wrong-state`,
    );

    const response = await handleShopifyRoutes({
      request,
      sessionManager,
      handlers: [
        createCustomerAccountServerHandlers({
          customerSession: createSession(),
        }),
      ],
    });

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(`${ORIGIN}/account?login=failed`);
    expect(response?.headers.get("set-cookie")).toBe("session=1");
    expect(sessionManager.data).toBeUndefined();
    expect(sessionManager.removeCalls).toEqual([SESSION_KEY]);
  });
});
