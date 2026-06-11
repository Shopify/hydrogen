import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createStorefrontRequestContext, type StorefrontRequestContext } from "../core/headers";
import { gql } from "../graphql";
import { createStorefrontClient } from "./client";
import { StorefrontApiError, StorefrontTimeoutError } from "./errors";
import type { I18nConfig, StorefrontClient } from "./types";

const SHOP_QUERY = gql(`query { shop { name } }`);
const PRODUCT_QUERY = gql(
  `query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) { title } }`,
);
const LOCALIZED_QUERY = gql(
  `query Localized($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { shop { name } }`,
);
const NO_I18N_QUERY = gql(`query Simple { shop { name } }`);

function mockResponse(body: object, init?: ResponseInit & { headers?: Record<string, string> }) {
  const headers = new Headers(init?.headers);
  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", "mock-req-id");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

function createMockFetch(response?: Response) {
  return vi
    .fn()
    .mockResolvedValue(response ?? mockResponse({ data: { shop: { name: "Test Shop" } } }));
}

describe("createStorefrontClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("construction", () => {
    it("returns an object with graphql function and URL strings", () => {
      const client = createPublicClient({ fetch: mockFetch });

      expect(client.type).toBe("public");
      expect(typeof client.graphql).toBe("function");
      expect(typeof client.apiUrl).toBe("string");
      expect(typeof client.storeUrl).toBe("string");
    });

    it("constructs storeUrl and apiUrl from storeDomain and pinned API version", () => {
      const client = createPublicClient({
        storeDomain: "my-store.myshopify.com",
        fetch: mockFetch,
      });

      expect(client.storeUrl).toBe("https://my-store.myshopify.com");
      expect(client.apiUrl).toBe("https://my-store.myshopify.com/api/2026-04/graphql.json");
    });

    it("constructs apiUrl from explicit apiVersion", () => {
      const client = createPublicClient({
        storeDomain: "my-store.myshopify.com",
        apiVersion: "2026-01",
        fetch: mockFetch,
      });

      expect(client.storeUrl).toBe("https://my-store.myshopify.com");
      expect(client.apiUrl).toBe("https://my-store.myshopify.com/api/2026-01/graphql.json");
    });

    it("normalizes storeDomain without protocol", () => {
      const client = createPublicClient({
        storeDomain: "my-store.myshopify.com",
        fetch: mockFetch,
      });
      expect(client.storeUrl).toBe("https://my-store.myshopify.com");
      expect(client.apiUrl).toContain("https://my-store.myshopify.com");
    });

    it("normalizes storeDomain with existing protocol", () => {
      const client = createPublicClient({
        storeDomain: "https://my-store.myshopify.com",
        fetch: mockFetch,
      });
      expect(client.storeUrl).toBe("https://my-store.myshopify.com");
      expect(client.apiUrl).toBe("https://my-store.myshopify.com/api/2026-04/graphql.json");
    });

    it("throws when no fetch available", () => {
      const originalFetch = globalThis.fetch;
      // @ts-expect-error — intentionally removing fetch
      delete globalThis.fetch;

      try {
        expect(() => createPublicClient({ fetch: undefined })).toThrow("fetch");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("uses globalThis.fetch when fetch option is undefined", async () => {
      const globalMockFetch = createMockFetch();
      vi.stubGlobal("fetch", globalMockFetch);

      const client = createPublicClient({ fetch: undefined });
      await client.graphql(SHOP_QUERY);

      expect(globalMockFetch).toHaveBeenCalledOnce();
    });

    it("uses custom fetch when provided", async () => {
      const client = createPublicClient({ fetch: mockFetch });
      await client.graphql(SHOP_QUERY);

      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("throws for empty storeDomain", () => {
      expect(() => createPublicClient({ storeDomain: "", fetch: mockFetch })).toThrow(
        "storeDomain",
      );
    });

    it("throws for empty public token", () => {
      expect(() =>
        createPublicClient({
          publicStorefrontToken: "",
          fetch: mockFetch,
        }),
      ).toThrow("publicStorefrontToken");
    });

    it("throws for empty private token", () => {
      expect(() =>
        createPrivateClient({
          privateStorefrontToken: "",
          fetch: mockFetch,
        }),
      ).toThrow("privateStorefrontToken");
    });

    it("throws for negative defaultTimeoutInMs", () => {
      expect(() => createPublicClient({ defaultTimeoutInMs: -1, fetch: mockFetch })).toThrow(
        "defaultTimeoutInMs",
      );
    });

    it("throws for NaN defaultTimeoutInMs", () => {
      expect(() => createPublicClient({ defaultTimeoutInMs: NaN, fetch: mockFetch })).toThrow(
        "defaultTimeoutInMs",
      );
    });

    it("throws when private token used in browser context", () => {
      vi.stubGlobal("document", {});

      try {
        expect(() => createPrivateClient({ fetch: mockFetch })).toThrow("private");
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("headers", () => {
    it("sends content-type header", async () => {
      const client = createPublicClient({ fetch: mockFetch });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("content-type")).toBe("application/json");
    });

    it("sends SDK variant headers", async () => {
      const client = createPublicClient({ fetch: mockFetch });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("X-SDK-Variant")).toBe("hydrogen");
      expect(headers.get("X-SDK-Variant-Source")).toBe("kit");
      expect(headers.get("X-SDK-Version")).toBe("2026-04");
    });

    it("sends hydrogen version header", async () => {
      const client = createPublicClient({ fetch: mockFetch });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("X-Hydrogen-Version")).toBeTruthy();
    });

    it("sends public access token header", async () => {
      const client = createPublicClient({
        publicStorefrontToken: "pub-token-123",
        fetch: mockFetch,
      });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("X-Shopify-Storefront-Access-Token")).toBe("pub-token-123");
    });

    it("sends request context headers", async () => {
      const requestContext = createStorefrontRequestContext(
        new Request("https://example.com", {
          headers: { cookie: "_shopify_y=unique-token; _shopify_s=visit-token" },
        }),
      );
      const client = createPublicClient({ fetch: mockFetch, requestContext });

      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("cookie")).toBe("_shopify_y=unique-token; _shopify_s=visit-token");
      expect(headers.get("X-Shopify-UniqueToken")).toBe("unique-token");
      expect(headers.get("X-Shopify-VisitToken")).toBe("visit-token");
      expect(headers.get("Custom-Storefront-Request-Group-ID")).toBeTruthy();
    });

    it("sends private access token header", async () => {
      const client = createPrivateClient({
        privateStorefrontToken: "priv-token-456",
        fetch: mockFetch,
      });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("Shopify-Storefront-Private-Token")).toBe("priv-token-456");
    });

    it("sends buyer meta headers for private client", async () => {
      const requestContext = createStorefrontRequestContext(
        new Request("https://example.com", {
          headers: { "request-id": "request-context-group" },
        }),
      );
      const client = createPrivateClient({
        fetch: mockFetch,
        buyerIp: "10.0.0.1",
        requestContext,
      });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.get("Shopify-Storefront-Buyer-IP")).toBe("10.0.0.1");
      expect(headers.get("X-Shopify-Client-IP")).toBe("10.0.0.1");
      expect(headers.get("Custom-Storefront-Request-Group-ID")).toBe("request-context-group");
    });

    it("omits buyer meta headers for shared rate limit client (no request)", async () => {
      const client = createSharedRateLimitClient({ fetch: mockFetch });
      await client.graphql(SHOP_QUERY);

      const headers = getHeaders(mockFetch);
      expect(headers.has("Shopify-Storefront-Buyer-IP")).toBe(false);
    });
  });

  describe("i18n", () => {
    it("auto-injects country and language when declared in query", async () => {
      const client = createPublicClient({
        fetch: mockFetch,
        i18n: { language: "EN", country: "US" },
      });
      await client.graphql(LOCALIZED_QUERY);

      const body = getBody(mockFetch);
      expect(body.variables).toMatchObject({
        country: "US",
        language: "EN",
      });
    });

    it("does not inject i18n variables when not declared in query", async () => {
      const client = createPublicClient({
        fetch: mockFetch,
        i18n: { language: "EN", country: "US" },
      });
      await client.graphql(NO_I18N_QUERY);

      const body = getBody(mockFetch);
      expect(body.variables).not.toHaveProperty("country");
      expect(body.variables).not.toHaveProperty("language");
    });

    it("does not inject $country for $countryCode variable", async () => {
      const queryWithCountryCode = gql(`query Test($countryCode: String!) { shop { name } }`);
      const client = createPublicClient({
        fetch: mockFetch,
        i18n: { language: "EN", country: "US" },
      });
      await client.graphql(queryWithCountryCode as any, {
        variables: { countryCode: "US" } as any,
      });

      const body = getBody(mockFetch);
      expect(body.variables).not.toHaveProperty("country");
      expect(body.variables).toHaveProperty("countryCode", "US");
    });

    it("merges user variables with i18n variables", async () => {
      const client = createPublicClient({
        fetch: mockFetch,
        i18n: { language: "EN", country: "US" },
      });
      await client.graphql(PRODUCT_QUERY as any, {
        variables: { handle: "hoodie" } as any,
      });

      const body = getBody(mockFetch);
      expect(body.variables).toMatchObject({
        handle: "hoodie",
        country: "US",
        language: "EN",
      });
    });
  });

  describe("response handling", () => {
    it("returns data and errors on 200", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: { shop: { name: "My Shop" } },
          errors: [{ message: "partial warning" }],
        }),
      );

      const client = createPublicClient({ fetch: mockFetch });
      const result = await client.graphql(SHOP_QUERY);

      expect(result.data).toEqual({ shop: { name: "My Shop" } });
      expect(result.errors).toEqual([{ message: "partial warning" }]);
    });

    it("exposes response headers in result", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { data: { shop: { name: "Test" } } },
          {
            headers: {
              "x-request-id": "req-123",
              "x-custom": "some-value",
            },
          },
        ),
      );

      const client = createPublicClient({ fetch: mockFetch });
      const result = await client.graphql(SHOP_QUERY);

      expect(result.headers).toBeInstanceOf(Headers);
      expect(result.headers.get("x-request-id")).toBe("req-123");
      expect(result.headers.get("x-custom")).toBe("some-value");
    });

    it("returns data without errors on clean 200", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ data: { shop: { name: "Test" } } }));

      const client = createPublicClient({ fetch: mockFetch });
      const result = await client.graphql(SHOP_QUERY);

      expect(result.data).toEqual({ shop: { name: "Test" } });
      expect(result.errors).toBeUndefined();
    });

    it("returns null data when response has errors but no data key", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ errors: [{ message: "validation failed" }] }));

      const client = createPublicClient({ fetch: mockFetch });
      const result = await client.graphql(SHOP_QUERY);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual([{ message: "validation failed" }]);
    });

    it("throws StorefrontApiError on non-200", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { errors: [{ message: "server error" }] },
          {
            status: 500,
            headers: { "x-request-id": "req-500" },
          },
        ),
      );

      const client = createPublicClient({ fetch: mockFetch });
      await expect(client.graphql(SHOP_QUERY)).rejects.toThrow(StorefrontApiError);

      try {
        await client.graphql(SHOP_QUERY);
      } catch (error) {
        expect(error).toBeInstanceOf(StorefrontApiError);
        expect((error as StorefrontApiError).status).toBe(500);
        expect((error as StorefrontApiError).requestId).toBe("req-500");
      }
    });

    it("throws StorefrontApiError with status 429 on throttle", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ errors: [{ message: "throttled" }] }, { status: 429 }),
      );

      const client = createPublicClient({ fetch: mockFetch });

      try {
        await client.graphql(SHOP_QUERY);
      } catch (error) {
        expect((error as StorefrontApiError).status).toBe(429);
      }
    });

    it("returns data and errors for 200 with throttled GraphQL error", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: { shop: { name: "partial" } },
          errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }],
        }),
      );

      const client = createPublicClient({ fetch: mockFetch });
      const result = await client.graphql(SHOP_QUERY);

      expect(result.data).toBeTruthy();
      expect(result.errors?.[0].message).toBe("Throttled");
    });

    it("throws StorefrontApiError on JSON parse failure with body snippet", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("not json at all", {
          status: 200,
          headers: { "x-request-id": "req-parse" },
        }),
      );

      const client = createPublicClient({ fetch: mockFetch });

      try {
        await client.graphql(SHOP_QUERY);
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(StorefrontApiError);
        expect((error as StorefrontApiError).message).toContain("Failed to parse");
        expect((error as StorefrontApiError).message).toContain("not json at all");
      }
    });

    it.each([
      { label: "null", body: "null", expectedType: "object" },
      { label: "array", body: "[1,2,3]", expectedType: "array" },
      { label: "number", body: "42", expectedType: "number" },
      { label: "string", body: '"hello"', expectedType: "string" },
    ])(
      "throws StorefrontApiError when SFAPI returns valid JSON of unexpected type ($label)",
      async ({ body, expectedType }) => {
        mockFetch.mockResolvedValueOnce(
          new Response(body, {
            status: 200,
            headers: { "x-request-id": "req-shape" },
          }),
        );

        const client = createPublicClient({ fetch: mockFetch });

        try {
          await client.graphql(SHOP_QUERY);
          expect.fail("should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(StorefrontApiError);
          expect((error as StorefrontApiError).message).toContain("unexpected JSON type");
          expect((error as StorefrontApiError).message).toContain(expectedType);
        }
      },
    );

    it("preserves HTTP status when body stream fails on non-ok response", async () => {
      const brokenBodyResponse = new Response(null, {
        status: 502,
        headers: { "x-request-id": "req-502-broken" },
      });
      vi.spyOn(brokenBodyResponse, "text").mockRejectedValue(
        new TypeError("network error during body read"),
      );

      mockFetch.mockResolvedValueOnce(brokenBodyResponse);
      const client = createPublicClient({ fetch: mockFetch });

      try {
        await client.graphql(SHOP_QUERY);
        expect.fail("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(StorefrontApiError);
        expect((error as StorefrontApiError).status).toBe(502);
        expect((error as StorefrontApiError).requestId).toBe("req-502-broken");
      }
    });

    it("throws StorefrontApiError wrapping network error", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("network fail"));

      const client = createPublicClient({ fetch: mockFetch });
      await expect(client.graphql(SHOP_QUERY)).rejects.toThrow(StorefrontApiError);

      try {
        await client.graphql(SHOP_QUERY);
      } catch (error) {
        expect((error as StorefrontApiError).cause).toBeInstanceOf(TypeError);
      }
    });
  });

  describe("timeout and signals", () => {
    it("throws StorefrontTimeoutError after timeout", async () => {
      mockFetch.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            const { signal } = init;
            signal?.addEventListener("abort", () => {
              reject(signal.reason);
            });
          }),
      );

      const client = createPublicClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 10,
      });

      await expect(client.graphql(SHOP_QUERY)).rejects.toThrow(StorefrontTimeoutError);
    });

    it("disables timeout when defaultTimeoutInMs is 0", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

      const client = createPublicClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
      });
      await client.graphql(SHOP_QUERY);

      expect(timeoutSpy).not.toHaveBeenCalled();
      timeoutSpy.mockRestore();
    });

    it("forwards requestContext signal to fetch", async () => {
      const controller = new AbortController();
      const requestContext = createStorefrontRequestContext(
        new Request("http://localhost", {
          signal: controller.signal,
        }),
      );
      const client = createPrivateClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
        requestContext,
      });

      await client.graphql(SHOP_QUERY);

      const [, fetchInit] = mockFetch.mock.calls[0];
      expect(fetchInit.signal).toBeInstanceOf(AbortSignal);
    });

    it("aborts when per-call signal aborts", async () => {
      const controller = new AbortController();
      mockFetch.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );

      const client = createPublicClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
      });

      const promise = client.graphql(SHOP_QUERY, { signal: controller.signal });
      controller.abort(new DOMException("caller aborted", "AbortError"));

      await expect(promise).rejects.toThrow("caller aborted");
    });

    it("throws AbortError when per-call signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort(new DOMException("already aborted", "AbortError"));
      const client = createPublicClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
      });

      await expect(client.graphql(SHOP_QUERY, { signal: controller.signal })).rejects.toThrow(
        "already aborted",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws AbortError when requestContext signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const requestContext = createStorefrontRequestContext(
        new Request("http://localhost", {
          signal: controller.signal,
        }),
      );

      const client = createPrivateClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
        requestContext,
      });

      await expect(client.graphql(SHOP_QUERY)).rejects.toThrow("abort");
    });

    it("throws native AbortError on consumer abort, not StorefrontTimeoutError", async () => {
      const controller = new AbortController();

      mockFetch.mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );

      const client = createPrivateClient({
        fetch: mockFetch,
        defaultTimeoutInMs: 0,
        requestContext: createStorefrontRequestContext(
          new Request("http://localhost", {
            signal: controller.signal,
          }),
        ),
      });

      const promise = client.graphql(SHOP_QUERY);

      controller.abort();

      await expect(promise).rejects.toThrow();
      try {
        await promise;
      } catch (error) {
        expect(error).not.toBeInstanceOf(StorefrontTimeoutError);
      }
    });
  });
});

const DEFAULT_I18N = { language: "EN", country: "US" } as I18nConfig;

function createPublicClient(
  overrides: {
    storeDomain?: string;
    apiVersion?: string;
    publicStorefrontToken?: string;
    fetch?: typeof globalThis.fetch;
    i18n?: I18nConfig;
    requestContext?: StorefrontRequestContext;
    defaultTimeoutInMs?: number;
  } = {},
) {
  return createStorefrontClient({
    type: "public",
    config: {
      storeDomain: overrides.storeDomain ?? "test.myshopify.com",
      apiVersion: overrides.apiVersion,
      publicStorefrontToken: overrides.publicStorefrontToken ?? "test-pub-token",
      fetch: overrides.fetch,
      i18n: overrides.i18n ?? DEFAULT_I18N,
      requestContext: overrides.requestContext,
      defaultTimeoutInMs: overrides.defaultTimeoutInMs,
    },
  });
}

function createPrivateClient(
  overrides: {
    storeDomain?: string;
    apiVersion?: string;
    privateStorefrontToken?: string;
    fetch?: typeof globalThis.fetch;
    buyerIp?: string;
    i18n?: I18nConfig;
    requestContext?: StorefrontRequestContext;
    defaultTimeoutInMs?: number;
  } = {},
): StorefrontClient {
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: overrides.storeDomain ?? "test.myshopify.com",
      apiVersion: overrides.apiVersion,
      privateStorefrontToken: overrides.privateStorefrontToken ?? "test-priv-token",
      buyerIp: overrides.buyerIp ?? "127.0.0.1",
      fetch: overrides.fetch,
      i18n: overrides.i18n ?? DEFAULT_I18N,
      requestContext: overrides.requestContext,
      defaultTimeoutInMs: overrides.defaultTimeoutInMs,
    },
  });
}

function createSharedRateLimitClient(
  overrides: {
    storeDomain?: string;
    apiVersion?: string;
    privateStorefrontToken?: string;
    fetch?: typeof globalThis.fetch;
    i18n?: I18nConfig;
    requestContext?: StorefrontRequestContext;
    defaultTimeoutInMs?: number;
  } = {},
) {
  return createStorefrontClient({
    type: "private_shared_rate_limit",
    config: {
      storeDomain: overrides.storeDomain ?? "test.myshopify.com",
      apiVersion: overrides.apiVersion,
      privateStorefrontToken: overrides.privateStorefrontToken ?? "test-priv-token",
      fetch: overrides.fetch,
      i18n: overrides.i18n ?? DEFAULT_I18N,
      requestContext: overrides.requestContext,
      defaultTimeoutInMs: overrides.defaultTimeoutInMs,
    },
  });
}

function getHeaders(mockFn: ReturnType<typeof vi.fn>): Headers {
  const [, init] = mockFn.mock.calls[mockFn.mock.calls.length - 1];
  return new Headers(init?.headers);
}

function getBody(mockFn: ReturnType<typeof vi.fn>): {
  query: string;
  variables: Record<string, unknown>;
} {
  const [, init] = mockFn.mock.calls[mockFn.mock.calls.length - 1];
  return JSON.parse(init?.body);
}
