import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "../handle-shopify-routes";
import { createShopifyRequestContext } from "../headers";
import { assert } from "../test-utils";
import { DEFAULT_PREDICTIVE_SEARCH_LIMIT, getEmptyPredictiveSearchResult } from "./search";
import { createPredictiveSearchServerHandlers } from "./server-handlers";

const DEFAULT_I18N = { country: "US", language: "EN" } as const;

const MOCK_ITEMS = {
  products: [
    {
      __typename: "Product",
      id: "gid://shopify/Product/1",
      title: "Snowboard",
      handle: "snowboard",
      trackingParameters: "_pos=1&_psq=snow&_ss=e&_v=1.0",
      selectedOrFirstAvailableVariant: null,
    },
  ],
  collections: [],
  pages: [],
  articles: [],
  queries: [
    {
      __typename: "SearchQuerySuggestion",
      text: "snowboard",
      styledText: "<b>snow</b>board",
      trackingParameters: null,
    },
  ],
};

function mockGqlResponse(data: unknown, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: responseHeaders,
  });
}

function createPredictiveSearchRequest(search = "?q=snow"): Request {
  return new Request(`https://my-app.com/api/predictive-search${search}`, { method: "GET" });
}

function createPrivateStorefrontClient(request: Request) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n: DEFAULT_I18N }),
    config: {
      storeDomain: "https://test-store.myshopify.com",
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handlePredictiveSearchRequest(request: Request) {
  const storefrontClient = createPrivateStorefrontClient(request);
  return handleShopifyRoutesImpl({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
    handlers: [createPredictiveSearchServerHandlers()],
  });
}

function createTestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

function parseGraphqlVariables(fetchCall: unknown[]) {
  const init = fetchCall[1] as RequestInit;
  return JSON.parse(String(init.body)).variables as Record<string, unknown>;
}

describe("createPredictiveSearchServerHandlers", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("handler contract", () => {
    it("exposes literal route metadata", () => {
      const handlers = createPredictiveSearchServerHandlers();

      expect(handlers.get.pathname).toBe("/api/predictive-search");
      expect(handlers.get.method).toBe("GET");
    });

    it("returns predictive search data directly from get", async () => {
      const headers = new Headers({ "x-request-id": "123", "content-length": "999" });
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }, headers));
      const request = createPredictiveSearchRequest();
      const handlers = createPredictiveSearchServerHandlers();

      const result = await handlers.get({
        request,
        storefrontClient: createPrivateStorefrontClient(request),
      });

      expect(result).not.toBeInstanceOf(Response);
      expect(result.type).toBe("json");
      if (result.type !== "json") throw new Error("expected json result");
      expect(result.data).toEqual({ term: "snow", total: 2, items: MOCK_ITEMS });
      expect(new Headers(result.headers).get("x-request-id")).toBe("123");
      expect(new Headers(result.headers).has("content-length")).toBe(false);
    });
  });

  describe("URL matching", () => {
    it("returns null for non-predictive-search URLs", async () => {
      const result = await handlePredictiveSearchRequest(
        new Request("https://my-app.com/products"),
      );

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("matches /api/predictive-search exactly", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));

      const result = await handlePredictiveSearchRequest(createPredictiveSearchRequest());

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      await expect(result.json()).resolves.toEqual({ term: "snow", total: 2, items: MOCK_ITEMS });
    });

    it("supports a custom path", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));
      const request = new Request("https://my-app.com/custom-search?q=snow", { method: "GET" });
      const storefrontClient = createPrivateStorefrontClient(request);

      const result = await handleShopifyRoutesImpl({
        request,
        requestContext: storefrontClient.requestContext,
        sessionManager: createTestSessionManager(request),
        storefrontClient,
        handlers: [createPredictiveSearchServerHandlers({ path: "/custom-search" })],
      });

      assert(result, "expected a response");
      expect(result.status).toBe(200);
    });
  });

  describe("method restrictions", () => {
    it("returns 405 for POST", async () => {
      const result = await handlePredictiveSearchRequest(
        new Request("https://my-app.com/api/predictive-search", { method: "POST" }),
      );

      assert(result, "expected a response");
      expect(result.status).toBe(405);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("request parsing", () => {
    it("returns an empty result without Storefront API request for empty q", async () => {
      const result = await handlePredictiveSearchRequest(createPredictiveSearchRequest("?q=%20"));

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      await expect(result.json()).resolves.toEqual(getEmptyPredictiveSearchResult(""));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("clamps invalid limits through the query helper", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));

      await handlePredictiveSearchRequest(createPredictiveSearchRequest("?q=snow&limit=abc"));

      expect(parseGraphqlVariables(mockFetch.mock.calls[0]).limit).toBe(
        DEFAULT_PREDICTIVE_SEARCH_LIMIT,
      );
    });

    it("passes predictive search controls from URL params", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));

      await handlePredictiveSearchRequest(
        createPredictiveSearchRequest(
          "?q=snow&limit=3&limitScope=ALL&types=PRODUCT,QUERY&searchableFields=TITLE,TAG&unavailableProducts=LAST",
        ),
      );

      expect(parseGraphqlVariables(mockFetch.mock.calls[0])).toEqual(
        expect.objectContaining({
          term: "snow",
          limit: 3,
          limitScope: "ALL",
          types: ["PRODUCT", "QUERY"],
          searchableFields: ["TITLE", "TAG"],
          unavailableProducts: "LAST",
        }),
      );
    });

    it("supports repeated predictive search controls", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));

      await handlePredictiveSearchRequest(
        createPredictiveSearchRequest(
          "?q=snow&types=PRODUCT&types=QUERY&searchableFields=TITLE&searchableFields=TAG",
        ),
      );

      expect(parseGraphqlVariables(mockFetch.mock.calls[0])).toEqual(
        expect.objectContaining({
          types: ["PRODUCT", "QUERY"],
          searchableFields: ["TITLE", "TAG"],
        }),
      );
    });

    it("uses configured defaults", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ predictiveSearch: MOCK_ITEMS }));
      const request = createPredictiveSearchRequest();
      const handlers = createPredictiveSearchServerHandlers({
        limit: 4,
        limitScope: "ALL",
        types: ["PRODUCT"],
        searchableFields: ["TITLE"],
        unavailableProducts: "SHOW",
      });

      await handlers.get({ request, storefrontClient: createPrivateStorefrontClient(request) });

      expect(parseGraphqlVariables(mockFetch.mock.calls[0])).toEqual(
        expect.objectContaining({
          limit: 4,
          limitScope: "ALL",
          types: ["PRODUCT"],
          searchableFields: ["TITLE"],
          unavailableProducts: "SHOW",
        }),
      );
    });

    it("returns a typed error for invalid enum values", async () => {
      const result = await handlePredictiveSearchRequest(
        createPredictiveSearchRequest("?q=snow&types=PRODUCT,INVALID"),
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      await expect(result.json()).resolves.toEqual({
        error: {
          code: "invalid_predictive_search_request",
          message: 'Invalid types value "INVALID".',
        },
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns a typed error for invalid limitScope values", async () => {
      const result = await handlePredictiveSearchRequest(
        createPredictiveSearchRequest("?q=snow&limitScope=INVALID"),
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      await expect(result.json()).resolves.toEqual({
        error: {
          code: "invalid_predictive_search_request",
          message: 'Invalid limitScope value "INVALID".',
        },
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns a typed error for invalid searchableFields values", async () => {
      const result = await handlePredictiveSearchRequest(
        createPredictiveSearchRequest("?q=snow&searchableFields=TITLE,INVALID"),
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      await expect(result.json()).resolves.toEqual({
        error: {
          code: "invalid_predictive_search_request",
          message: 'Invalid searchableFields value "INVALID".',
        },
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns a typed error for invalid unavailableProducts values", async () => {
      const result = await handlePredictiveSearchRequest(
        createPredictiveSearchRequest("?q=snow&unavailableProducts=INVALID"),
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      await expect(result.json()).resolves.toEqual({
        error: {
          code: "invalid_predictive_search_request",
          message: 'Invalid unavailableProducts value "INVALID".',
        },
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("errors", () => {
    it("returns a typed error when Storefront API errors", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: [{ message: "Nope" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await handlePredictiveSearchRequest(createPredictiveSearchRequest());

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      await expect(result.json()).resolves.toEqual({
        error: {
          code: "invalid_predictive_search_request",
          message: "Shopify API errors: Nope",
        },
      });
    });
  });
});
