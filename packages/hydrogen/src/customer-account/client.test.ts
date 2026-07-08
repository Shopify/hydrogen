import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createShopifyRequestContext,
  STOREFRONT_URL_HEADER,
  type I18nConfig,
  type ShopifyRequestContext,
} from "../core/headers";
import {
  createCustomerAccountClient,
  CustomerAccountApiError,
  CustomerAccountAuthenticationError,
  CustomerAccountTimeoutError,
  CUSTOMER_ACCOUNT_API_VERSION,
  gql,
} from "./index";

const SHOP_ID = "123456789";
const CUSTOMER_ACCOUNT_TOKEN = "customer-token";
const LANGUAGE_CODE = "FR";
const DEFAULT_I18N = { country: "US", language: "EN" } satisfies I18nConfig;
const LONG_TIMEOUT_IN_MS = 60_000;
const TOO_LONG_TIMEOUT_IN_MS = 2_147_483_648;
const CUSTOMER_QUERY = gql(`query CustomerName { customer { firstName } }`);
const LOCALIZED_CUSTOMER_QUERY = gql(
  `query CustomerName($language: LanguageCode) @inContext(language: $language) { customer { firstName } }`,
);

function mockResponse(body: object, init?: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

function createMockFetch(response?: Response) {
  return vi
    .fn()
    .mockResolvedValue(response ?? mockResponse({ data: { customer: { firstName: "Ada" } } }));
}

function createNeverResolvingPromise<T>(): Promise<T> {
  return new Promise(() => {});
}

function createRequest(url = "https://example.com/account") {
  return new Request(url);
}

function createRequestContext(url?: string): ShopifyRequestContext<typeof DEFAULT_I18N>;
function createRequestContext<const I18n extends I18nConfig>(
  url: string,
  i18n: I18n,
): ShopifyRequestContext<I18n>;
function createRequestContext(url = "https://example.com/account", i18n = DEFAULT_I18N) {
  return createShopifyRequestContext({ request: createRequest(url), i18n });
}

function createHeaderRequestContext(url: string): ShopifyRequestContext<typeof DEFAULT_I18N> {
  return createShopifyRequestContext({
    request: { headers: new Headers({ [STOREFRONT_URL_HEADER]: url }) },
    i18n: DEFAULT_I18N,
  });
}

function createClient(overrides: Partial<Parameters<typeof createCustomerAccountClient>[0]> = {}) {
  return createCustomerAccountClient({
    shopId: SHOP_ID,
    requestContext: createRequestContext(),
    fetch: createMockFetch(),
    ...overrides,
  });
}

function graphqlOptions(overrides: Record<string, unknown> = {}) {
  return { accessToken: CUSTOMER_ACCOUNT_TOKEN, ...overrides };
}

function getFetchRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init as RequestInit };
}

describe("createCustomerAccountClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("derives the Customer Account API URL from shop ID and default version", () => {
    const client = createClient();

    expect(client.apiUrl).toBe(
      `https://shopify.com/${SHOP_ID}/account/customer/api/${CUSTOMER_ACCOUNT_API_VERSION}/graphql`,
    );
  });

  it("derives the Customer Account API URL from an explicit version", () => {
    const customerApiVersion = "2026-01";
    const client = createClient({ customerApiVersion });

    expect(client.apiUrl).toBe(
      `https://shopify.com/${SHOP_ID}/account/customer/api/${customerApiVersion}/graphql`,
    );
  });

  it("throws for non-numeric shop IDs", () => {
    expect(() => createClient({ shopId: "mock-shop" })).toThrow("shopId");
  });

  it("throws for invalid Customer Account API versions", () => {
    expect(() => createClient({ customerApiVersion: "2026.04" })).toThrow("customerApiVersion");
  });

  it("throws when created in a browser context", () => {
    vi.stubGlobal("document", {});
    try {
      expect(() => createClient()).toThrow("browser context");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws for infinite defaultTimeoutInMs", () => {
    expect(() => createClient({ defaultTimeoutInMs: Infinity })).toThrow("defaultTimeoutInMs");
  });

  it("throws for zero defaultTimeoutInMs", () => {
    expect(() => createClient({ defaultTimeoutInMs: 0 })).toThrow("defaultTimeoutInMs");
  });

  it("throws for timeout values above runtime timer limits", () => {
    expect(() => createClient({ defaultTimeoutInMs: TOO_LONG_TIMEOUT_IN_MS })).toThrow(
      "defaultTimeoutInMs",
    );
  });

  it("sends Customer Account headers and body", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { url, init } = getFetchRequest(fetchMock);
    const headers = new Headers(init.headers);
    expect(url).toBe(client.apiUrl);
    expect(init.method).toBe("POST");
    expect(headers.get("Authorization")).toBe(CUSTOMER_ACCOUNT_TOKEN);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Origin")).toBe("https://example.com");
    expect(headers.get("User-Agent")).toBeTruthy();
    expect(headers.get("Cookie")).toBeNull();
    expect(headers.get("Shopify-Storefront-Y")).toBeNull();
    expect(JSON.parse(String(init.body))).toEqual({
      query: "query CustomerName { customer { firstName } }",
      variables: {},
    });
  });

  it("marks the response as personalized before making Customer Account requests", async () => {
    const requestContext = createRequestContext();
    const client = createClient({ requestContext });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const headers = new Headers({ "cache-control": "public, s-maxage=600" });
    requestContext.applyResponseHeaders(headers);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("auto-fills language when the query declares a language variable", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({
      fetch: fetchMock,
      requestContext: createRequestContext("https://example.com/account", {
        country: "CA",
        language: LANGUAGE_CODE,
      }),
    });

    await client.graphql(LOCALIZED_CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(JSON.parse(String(init.body))).toEqual({
      query:
        "query CustomerName($language: LanguageCode) @inContext(language: $language) { customer { firstName } }",
      variables: { language: LANGUAGE_CODE },
    });
  });

  it("preserves caller-provided language variables", async () => {
    const callerLanguageCode = "DE";
    const fetchMock = createMockFetch();
    const client = createClient({
      fetch: fetchMock,
      requestContext: createRequestContext("https://example.com/account", {
        country: "CA",
        language: LANGUAGE_CODE,
      }),
    });

    await client.graphql(LOCALIZED_CUSTOMER_QUERY, {
      accessToken: CUSTOMER_ACCOUNT_TOKEN,
      variables: { language: callerLanguageCode },
    });

    const { init } = getFetchRequest(fetchMock);
    expect(JSON.parse(String(init.body))).toEqual({
      query:
        "query CustomerName($language: LanguageCode) @inContext(language: $language) { customer { firstName } }",
      variables: { language: callerLanguageCode },
    });
  });

  it("uses an https origin when the incoming local request is http", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({
      fetch: fetchMock,
      requestContext: createRequestContext("http://localhost:3000/account"),
    });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(new Headers(init.headers).get("Origin")).toBe("https://localhost:3000");
  });

  it("uses an https origin when the incoming local request is IPv6 localhost", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({
      fetch: fetchMock,
      requestContext: createRequestContext("http://[::1]:3000/account"),
    });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(new Headers(init.headers).get("Origin")).toBe("https://[::1]:3000");
  });

  it("uses the request context URL header when request.url is unavailable", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({
      fetch: fetchMock,
      requestContext: createHeaderRequestContext("https://header.example/account"),
    });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(new Headers(init.headers).get("Origin")).toBe("https://header.example");
  });

  it("rejects non-local http origins", () => {
    expect(() =>
      createClient({ requestContext: createRequestContext("http://example.com/account") }),
    ).toThrow("HTTPS");
  });

  it("fails closed before fetch when no per-call access token is available", async () => {
    const fetchMock = createMockFetch();
    const requestContext = createRequestContext();
    const client = createClient({ fetch: fetchMock, requestContext });

    await expect(
      client.graphql(CUSTOMER_QUERY, { accessToken: null as unknown as string }),
    ).rejects.toThrow(CustomerAccountAuthenticationError);
    expect(fetchMock).not.toHaveBeenCalled();

    const headers = new Headers({ "cache-control": "public, s-maxage=600" });
    requestContext.applyResponseHeaders(headers);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("fails closed before fetch when options are omitted at runtime", async () => {
    const fetchMock = createMockFetch();
    const requestContext = createRequestContext();
    const client = createClient({ fetch: fetchMock, requestContext });

    // @ts-expect-error options are required; this verifies the runtime boundary.
    await expect(client.graphql(CUSTOMER_QUERY)).rejects.toThrow(
      CustomerAccountAuthenticationError,
    );
    expect(fetchMock).not.toHaveBeenCalled();

    const headers = new Headers({ "cache-control": "public, s-maxage=600" });
    requestContext.applyResponseHeaders(headers);
    expect(headers.get("cache-control")).toBe("public, s-maxage=600");
  });

  it("fails closed before fetch when the access token has unsafe whitespace", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await expect(
      client.graphql(CUSTOMER_QUERY, { accessToken: `${CUSTOMER_ACCOUNT_TOKEN} ` }),
    ).rejects.toThrow(CustomerAccountAuthenticationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed before fetch when the access token has control characters", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await expect(
      client.graphql(CUSTOMER_QUERY, { accessToken: `${CUSTOMER_ACCOUNT_TOKEN}\n` }),
    ).rejects.toThrow(CustomerAccountAuthenticationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed before fetch when the access token is not a string", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await expect(
      client.graphql(CUSTOMER_QUERY, { accessToken: 123 as unknown as string }),
    ).rejects.toThrow(CustomerAccountAuthenticationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws CustomerAccountTimeoutError after timeout", async () => {
    const timeoutInMs = 10;
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: timeoutInMs });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountTimeoutError,
    );
  });

  it("throws CustomerAccountTimeoutError when custom fetch ignores abort signals", async () => {
    const fetchMock = vi.fn(() => createNeverResolvingPromise<Response>());
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: 10 });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountTimeoutError,
    );
  });

  it("throws CustomerAccountTimeoutError when response body parsing times out", async () => {
    const response = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => createNeverResolvingPromise<unknown>(),
    } as Response;
    const fetchMock = createMockFetch(response);
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: 10 });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountTimeoutError,
    );
  });

  it("clears the timeout after a successful request", async () => {
    expect.assertions(2);
    vi.useFakeTimers();

    try {
      const fetchMock = vi.fn(() => {
        expect(vi.getTimerCount()).toBe(1);
        return Promise.resolve(mockResponse({ data: { customer: { firstName: "Ada" } } }));
      });
      const client = createClient({ fetch: fetchMock });

      await client.graphql(CUSTOMER_QUERY, graphqlOptions());

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts when per-call signal aborts", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: LONG_TIMEOUT_IN_MS });

    const promise = client.graphql(CUSTOMER_QUERY, graphqlOptions({ signal: controller.signal }));
    controller.abort(new DOMException("caller aborted", "AbortError"));

    await expect(promise).rejects.toThrow("caller aborted");
  });

  it("aborts when requestContext signal aborts", async () => {
    const controller = new AbortController();
    const requestContext = createShopifyRequestContext({
      request: new Request("https://example.com/account", { signal: controller.signal }),
      i18n: DEFAULT_I18N,
    });
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = createClient({
      fetch: fetchMock,
      requestContext,
      defaultTimeoutInMs: LONG_TIMEOUT_IN_MS,
    });

    const promise = client.graphql(CUSTOMER_QUERY, graphqlOptions());
    controller.abort(new DOMException("request aborted", "AbortError"));

    await expect(promise).rejects.toThrow("request aborted");
  });

  it("preserves arbitrary abort reasons", async () => {
    const controller = new AbortController();
    const abortReason = new Error("route changed");
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: LONG_TIMEOUT_IN_MS });

    const promise = client.graphql(CUSTOMER_QUERY, graphqlOptions({ signal: controller.signal }));
    controller.abort(abortReason);

    await expect(promise).rejects.toBe(abortReason);
  });

  it("throws before fetch when per-call signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort(new DOMException("already aborted", "AbortError"));
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await expect(
      client.graphql(CUSTOMER_QUERY, graphqlOptions({ signal: controller.signal })),
    ).rejects.toThrow("already aborted");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels response bodies when body parsing is aborted", async () => {
    const controller = new AbortController();
    const cancel = vi.fn(() => Promise.resolve());
    const response = {
      ok: true,
      status: 200,
      headers: new Headers(),
      body: { cancel },
      json: () => {
        controller.abort(new DOMException("body aborted", "AbortError"));
        return createNeverResolvingPromise<unknown>();
      },
    } as unknown as Response;
    const fetchMock = createMockFetch(response);
    const client = createClient({ fetch: fetchMock, defaultTimeoutInMs: LONG_TIMEOUT_IN_MS });

    const promise = client.graphql(CUSTOMER_QUERY, graphqlOptions({ signal: controller.signal }));

    await expect(promise).rejects.toThrow("body aborted");
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("throws CustomerAccountApiError for malformed response bodies", async () => {
    const fetchMock = createMockFetch(new Response(JSON.stringify([])));
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountApiError,
    );
  });

  it("throws CustomerAccountApiError for empty GraphQL response objects", async () => {
    const fetchMock = createMockFetch(new Response(JSON.stringify({})));
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountApiError,
    );
  });

  it("throws CustomerAccountApiError for null successful data", async () => {
    const fetchMock = createMockFetch(new Response(JSON.stringify({ data: null })));
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountApiError,
    );
  });

  it("returns GraphQL errors without throwing", async () => {
    const errors = [{ message: "Customer access is denied" }];
    const fetchMock = createMockFetch(
      new Response(JSON.stringify({ data: { customer: null }, errors })),
    );
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).resolves.toMatchObject({
      data: { customer: null },
      errors,
    });
  });

  it("exposes Retry-After on non-OK responses", async () => {
    const retryAfter = "5";
    const fetchMock = createMockFetch(
      new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": retryAfter, "x-request-id": "request-id" },
      }),
    );
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toMatchObject({
      retryAfter,
    });
  });

  it("does not retry failed requests", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountApiError,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("cancels non-OK response bodies before throwing", async () => {
    const cancel = vi.fn(() => Promise.resolve());
    const response = {
      ok: false,
      status: 500,
      headers: new Headers(),
      body: { cancel },
    } as unknown as Response;
    const fetchMock = createMockFetch(response);
    const client = createClient({ fetch: fetchMock });

    await expect(client.graphql(CUSTOMER_QUERY, graphqlOptions())).rejects.toThrow(
      CustomerAccountApiError,
    );
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("uses edge-compatible manual redirects with customer access tokens", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(init.redirect).toBe("manual");
  });

  it("opts authenticated Customer Account requests out of fetch caches", async () => {
    const fetchMock = createMockFetch();
    const client = createClient({ fetch: fetchMock });

    await client.graphql(CUSTOMER_QUERY, graphqlOptions());

    const { init } = getFetchRequest(fetchMock);
    expect(init.cache).toBe("no-store");
  });
});
