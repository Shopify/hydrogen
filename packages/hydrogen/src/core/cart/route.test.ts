import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "../handle-shopify-routes";
import { createShopifyRequestContext } from "../headers";
import { assert } from "../test-utils";
import { createCartServerHandlers } from "./server-handlers";

type TestStorefrontConfig = {
  storeDomain: string;
  i18n?: { country: "US" | "CA"; language: "EN" | "FR" };
};

const DEFAULT_I18N = { country: "US", language: "EN" } as const;

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "https://test-store.myshopify.com",
};
const APP_ORIGIN = "https://my-app.com";

const MOCK_LINE_COST = {
  totalAmount: { amount: "20.00", currencyCode: "USD" },
  subtotalAmount: { amount: "20.00", currencyCode: "USD" },
  amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
  compareAtAmountPerQuantity: null,
};

const MOCK_CART_COST = {
  subtotalAmount: { amount: "20.00", currencyCode: "USD" },
  totalAmount: { amount: "20.00", currencyCode: "USD" },
  checkoutChargeAmount: { amount: "20.00", currencyCode: "USD" },
};

const MOCK_CART_LINE = {
  id: "gid://shopify/CartLine/1",
  quantity: 2,
  cost: MOCK_LINE_COST,
  merchandise: {
    id: "gid://shopify/ProductVariant/1",
    title: "Default",
    image: null,
    product: { title: "Widget" },
  },
};

const MOCK_CART = {
  id: "gid://shopify/Cart/123",
  checkoutUrl: "https://test-store.myshopify.com/checkout",
  totalQuantity: 2,
  note: "",
  cost: MOCK_CART_COST,
  lines: { nodes: [MOCK_CART_LINE] },
  discountCodes: [],
};

function mockGqlResponse(data: unknown, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: responseHeaders,
  });
}

function mockGqlErrorResponse(errors: Array<{ message: string }>): Response {
  return new Response(JSON.stringify({ errors }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createGetRequest(cookies?: string): Request {
  const headers: Record<string, string> = {};
  if (cookies) headers.cookie = cookies;
  return new Request("https://my-app.com/api/cart", {
    method: "GET",
    headers,
  });
}

function createJsonPostRequest(
  body: unknown,
  cookies?: string,
  url = "https://my-app.com/api/cart",
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookies) headers.cookie = cookies;
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function createFormPostRequest(
  fields: Record<string, string>,
  opts?: { cookies?: string; referer?: string },
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  if (opts?.cookies) headers.cookie = opts.cookies;
  if (opts?.referer) headers.referer = opts.referer;
  return new Request("https://my-app.com/api/cart", {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  });
}

function createPrivateStorefrontClient(
  request: Request,
  fixture: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({
      request,
      i18n: fixture.i18n ?? DEFAULT_I18N,
    }),
    config: {
      storeDomain: fixture.storeDomain,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handleCartRequest(request: Request, fixture: TestStorefrontConfig = defaultConfig) {
  const storefrontClient = createPrivateStorefrontClient(request, fixture);
  return handleShopifyRoutesImpl({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
    handlers: [createCartServerHandlers()],
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

describe("createCartServerHandlers", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  describe("handler contract", () => {
    it("exposes literal route metadata", () => {
      const cartHandlers = createCartServerHandlers();

      expect(cartHandlers.get.pathname).toBe("/api/cart");
      expect(cartHandlers.get.method).toBe("GET");
      expect(cartHandlers.post.pathname).toBe("/api/cart");
      expect(cartHandlers.post.method).toBe("POST");
    });

    it("returns cart data objects directly from get", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: MOCK_CART }));
      const request = createGetRequest("cart=123");
      const cartHandlers = createCartServerHandlers();

      const result = await cartHandlers.get({
        request,
        storefrontClient: createPrivateStorefrontClient(request),
      });

      expect(result).not.toBeInstanceOf(Response);
      expect(result.type).toBe("json");
      expect(result.data.cart).toEqual(MOCK_CART);
      expect("status" in result).toBe(false);
    });

    it("returns typed cart request errors directly from post", async () => {
      const request = createJsonPostRequest({});
      const cartHandlers = createCartServerHandlers();

      const result = await cartHandlers.post({
        request,
        storefrontClient: createPrivateStorefrontClient(request),
      });

      expect(result.type).toBe("error");
      if (result.type !== "error") throw new Error("expected error result");
      expect(result.error).toEqual({
        code: "invalid_cart_request",
        message: 'Request body must contain "lines", "discountCodes", or "note".',
      });
      expect("status" in result).toBe(false);
    });
  });

  describe("URL matching", () => {
    it("returns null for non-cart URLs", async () => {
      const result = await handleCartRequest(
        new Request("https://my-app.com/products"),
        defaultConfig,
      );
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null for /api/cart/ with trailing slash", async () => {
      const result = await handleCartRequest(
        new Request("https://my-app.com/api/cart/"),
        defaultConfig,
      );
      expect(result).toBeNull();
    });

    it("matches /api/cart exactly", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: null }));
      const result = await handleCartRequest(createGetRequest(), defaultConfig);
      assert(result, "expected a response");
      expect(result.status).toBe(200);
    });
  });

  describe("method restrictions", () => {
    it("returns 405 for PUT", async () => {
      const request = new Request("https://my-app.com/api/cart", {
        method: "PUT",
      });
      const result = await handleCartRequest(request, defaultConfig);
      assert(result, "expected a response");
      expect(result.status).toBe(405);
    });

    it("returns 405 for DELETE", async () => {
      const request = new Request("https://my-app.com/api/cart", {
        method: "DELETE",
      });
      const result = await handleCartRequest(request, defaultConfig);
      assert(result, "expected a response");
      expect(result.status).toBe(405);
    });

    it("returns 405 for PATCH", async () => {
      const request = new Request("https://my-app.com/api/cart", {
        method: "PATCH",
      });
      const result = await handleCartRequest(request, defaultConfig);
      assert(result, "expected a response");
      expect(result.status).toBe(405);
    });
  });

  describe("GET", () => {
    it("returns cart data when cart cookie is present", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: MOCK_CART }));

      const result = await handleCartRequest(createGetRequest("cart=123"), defaultConfig);
      assert(result, "expected a response");
      const body = await result.json();
      expect(body.cart).toEqual(MOCK_CART);
    });

    it("forwards SFAPI server-timing when cart cookie is present", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(
          { cart: MOCK_CART },
          { "server-timing": '_y;desc="unique", _s;desc="visit"' },
        ),
      );

      const result = await handleCartRequest(createGetRequest("cart=123"), defaultConfig);

      assert(result, "expected a response");
      expect(result.headers.get("server-timing")).toBe('_y;desc="unique", _s;desc="visit"');
    });

    it("forwards browser cookies to SFAPI when loading a cart", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: MOCK_CART }));

      await handleCartRequest(
        createGetRequest("cart=123; _shopify_y=unique; _shopify_s=visit"),
        defaultConfig,
      );

      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get("cookie")).toBe("cart=123; _shopify_y=unique; _shopify_s=visit");
      expect(headers.get("x-shopify-uniquetoken")).toBe("unique");
      expect(headers.get("x-shopify-visittoken")).toBe("visit");
      expect(headers.get("custom-storefront-request-group-id")).toBeTruthy();
    });

    it("passes configured market context when loading a cart", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: MOCK_CART }));

      await handleCartRequest(createGetRequest("cart=123"), {
        ...defaultConfig,
        i18n: { country: "CA", language: "FR" },
      });

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables).toMatchObject({
        id: "gid://shopify/Cart/123",
        country: "CA",
        language: "FR",
      });
    });

    it("returns null cart without cart cookie", async () => {
      const result = await handleCartRequest(createGetRequest(), defaultConfig);
      assert(result, "expected a response");
      const body = await result.json();
      expect(body).toEqual({ cart: null });
      expect(result.headers.get("server-timing")).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws when SFAPI returns network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(handleCartRequest(createGetRequest("cart=123"), defaultConfig)).rejects.toThrow(
        "SFAPI request failed",
      );
    });

    it("returns null cart with GraphQL errors", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlErrorResponse([{ message: "Cart not found" }]));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const result = await handleCartRequest(createGetRequest("cart=123"), defaultConfig);
        assert(result, "expected a response");
        const body = await result.json();
        expect(body.cart).toBeNull();
        expect(body.errors).toEqual([{ message: "Cart not found" }]);
        expect(consoleError).toHaveBeenCalledOnce();
        expect(consoleError).toHaveBeenCalledWith("Cart not found");
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe("POST — JSON add-to-cart", () => {
    it("creates a new cart when no cart cookie exists", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      expect(result.headers.get("set-cookie")).toContain("cart=");

      const body = await result.json();
      expect(body.cart).toEqual(MOCK_CART);
      expect(body.userErrors).toEqual([]);
    });

    it("forwards SFAPI server-timing and Shopify cookies", async () => {
      const headers = new Headers({
        "server-timing": '_y;desc="unique", _s;desc="visit"',
      });
      headers.append("set-cookie", "_shopify_y=unique; Path=/; Secure");
      headers.append("set-cookie", "_shopify_s=visit; Path=/; Secure");

      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }, headers),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("server-timing")).toBe('_y;desc="unique", _s;desc="visit"');
      const cookie = result.headers.get("set-cookie");
      expect(cookie).toContain("_shopify_y=unique");
      expect(cookie).toContain("_shopify_s=visit");
      expect(cookie).toContain("cart=");
    });

    it("adds to existing cart when cookie is present", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesAdd: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(200);

      const body = await result.json();
      expect(body.cart).toEqual(MOCK_CART);

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/123");
    });

    it("forwards browser cookies to SFAPI when mutating a cart", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesAdd: { cart: MOCK_CART, userErrors: [] } }),
      );

      await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
          "cart=123; _shopify_y=unique; _shopify_s=visit",
        ),
        defaultConfig,
      );

      const [, init] = mockFetch.mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get("cookie")).toBe("cart=123; _shopify_y=unique; _shopify_s=visit");
      expect(headers.get("x-shopify-uniquetoken")).toBe("unique");
      expect(headers.get("x-shopify-visittoken")).toBe("visit");
      expect(headers.get("custom-storefront-request-group-id")).toBeTruthy();
    });
  });

  describe("POST — JSON update/remove", () => {
    it("calls cartLinesUpdate for update action", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      const body = await result.json();
      expect(body.cart).toEqual(MOCK_CART);
      expect(body.userErrors).toEqual([]);
    });

    it("uses body cartId for update action without a cart cookie", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({
          cartId: "gid://shopify/Cart/body-cart",
          lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      expect(result.headers.get("set-cookie")).toBeNull();

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/body-cart");
    });

    it("prefers body cartId over the cart cookie for update action", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      await handleCartRequest(
        createJsonPostRequest(
          {
            cartId: "gid://shopify/Cart/body-cart",
            lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }],
          },
          "cart=cookie-cart",
        ),
        defaultConfig,
      );

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/body-cart");
    });

    it("ignores cartId query param for POST cart identity", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }] },
          "cart=cookie-cart",
          "https://my-app.com/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fquery-cart",
        ),
        defaultConfig,
      );

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/cookie-cart");
    });

    it("calls cartLinesRemove for remove action", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ id: "gid://shopify/CartLine/1", quantity: 0 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      const body = await result.json();
      expect(body.userErrors).toEqual([]);
    });
  });

  describe("POST — JSON discount", () => {
    it("calls cartDiscountCodesUpdate for discount-update", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartDiscountCodesUpdate: { cart: MOCK_CART, userErrors: [] },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({ discountCodes: ["SAVE10"] }, "cart=123"),
        defaultConfig,
      );

      assert(result, "expected a response");
      const body = await result.json();
      expect(body.userErrors).toEqual([]);
    });

    it("forwards warnings from SFAPI discount mutation", async () => {
      const warnings = [
        {
          code: "DISCOUNT_NOT_FOUND",
          message: "Discount code BOGUS was not found",
          target: "gid://shopify/Cart/123",
        },
      ];
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartDiscountCodesUpdate: {
            cart: {
              ...MOCK_CART,
              discountCodes: [{ code: "BOGUS", applicable: false }],
            },
            userErrors: [],
            warnings,
          },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({ discountCodes: ["BOGUS"] }, "cart=123"),
        defaultConfig,
      );

      assert(result, "expected a response");
      const body = await result.json();
      expect(body.warnings).toEqual(warnings);
    });
  });

  describe("POST — JSON note", () => {
    it("calls cartNoteUpdate for note-update", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartNoteUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({ note: "Please gift wrap" }, "cart=123"),
        defaultConfig,
      );

      assert(result, "expected a response");
      const body = await result.json();
      expect(body.userErrors).toEqual([]);
    });
  });

  describe("POST — JSON error handling", () => {
    it("returns 400 for invalid request body", async () => {
      const result = await handleCartRequest(createJsonPostRequest({}), defaultConfig);
      assert(result, "expected a response");
      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.error).toEqual({
        code: "invalid_cart_request",
        message: 'Request body must contain "lines", "discountCodes", or "note".',
      });
    });

    it("returns 400 for mixed lines", async () => {
      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [
            { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 },
            { id: "gid://shopify/CartLine/2", quantity: 3 },
          ],
        }),
        defaultConfig,
      );
      assert(result, "expected a response");
      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.error).toEqual({
        code: "invalid_cart_request",
        message:
          "Mixed line operations are not allowed. Separate add, update, and remove into distinct requests.",
      });
    });

    it("returns 200 with userErrors from SFAPI", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartLinesAdd: {
            cart: null,
            userErrors: [{ message: "Out of stock", code: "INVALID" }],
          },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.userErrors).toEqual([{ message: "Out of stock", code: "INVALID" }]);
    });

    it("forwards warnings from SFAPI line mutations", async () => {
      const requestedQuantity = 5;
      const warnings = [
        {
          code: "MERCHANDISE_NOT_ENOUGH_STOCK",
          message: "Only 2 items available",
          target: "gid://shopify/CartLine/456",
        },
      ];
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartLinesAdd: { cart: MOCK_CART, userErrors: [], warnings },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          {
            lines: [
              { merchandiseId: "gid://shopify/ProductVariant/1", quantity: requestedQuantity },
            ],
          },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.warnings).toEqual(warnings);
    });

    it("throws on SFAPI network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        handleCartRequest(
          createJsonPostRequest(
            { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
            "cart=123",
          ),
          defaultConfig,
        ),
      ).rejects.toThrow("SFAPI request failed");
    });

    it("throws when GraphQL returns errors instead of data", async () => {
      mockFetch.mockResolvedValueOnce(mockGqlErrorResponse([{ message: "Throttled" }]));

      await expect(
        handleCartRequest(
          createJsonPostRequest(
            { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
            "cart=123",
          ),
          defaultConfig,
        ),
      ).rejects.toThrow("Throttled");
    });
  });

  describe("POST — missing cart (cartId guard)", () => {
    it("returns 400 for JSON update without cart cookie", async () => {
      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.error).toEqual({
        code: "missing_cart",
        message: "No cart exists. Add an item first.",
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns 400 for JSON remove without cart cookie", async () => {
      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [{ id: "gid://shopify/CartLine/1", quantity: 0 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(400);
      const body = await result.json();
      expect(body.error).toEqual({
        code: "missing_cart",
        message: "No cart exists. Add an item first.",
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns 303 redirect for FormData update without cart cookie", async () => {
      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "increase", lineId: "gid://shopify/CartLine/1", quantity: "2" },
          { referer: "https://my-app.com/cart" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/cart`);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("POST — FormData", () => {
    it("returns 303 redirect for increase intent", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesUpdate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "increase", lineId: "gid://shopify/CartLine/1", quantity: "2" },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/cart",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/cart`);
    });

    it("returns 303 redirect for remove intent", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "remove", lineId: "gid://shopify/CartLine/1" },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/products/widget",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/products/widget`);
    });

    it("redirects to / when no Referer header", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "remove", lineId: "gid://shopify/CartLine/1" },
          { cookies: "cart=123" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/`);
    });

    it("handles discount-apply from FormData", async () => {
      const cartWithDiscounts = {
        ...MOCK_CART,
        discountCodes: [{ code: "EXISTING", applicable: true }],
      };

      mockFetch
        .mockResolvedValueOnce(mockGqlResponse({ cart: cartWithDiscounts }))
        .mockResolvedValueOnce(
          mockGqlResponse({
            cartDiscountCodesUpdate: { cart: MOCK_CART, userErrors: [] },
          }),
        );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "discount-apply", discountCode: "SAVE10" },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/cart",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);

      const [, secondCallInit] = mockFetch.mock.calls[1];
      const gqlBody = JSON.parse(secondCallInit.body);
      expect(gqlBody.variables.discountCodes).toContain("EXISTING");
      expect(gqlBody.variables.discountCodes).toContain("SAVE10");
    });

    it("handles discount-remove from FormData", async () => {
      const cartWithDiscounts = {
        ...MOCK_CART,
        discountCodes: [
          { code: "KEEP", applicable: true },
          { code: "REMOVE", applicable: true },
        ],
      };

      mockFetch
        .mockResolvedValueOnce(mockGqlResponse({ cart: cartWithDiscounts }))
        .mockResolvedValueOnce(
          mockGqlResponse({
            cartDiscountCodesUpdate: { cart: MOCK_CART, userErrors: [] },
          }),
        );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "discount-remove", discountCode: "REMOVE" },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/cart",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);

      const [, secondCallInit] = mockFetch.mock.calls[1];
      const gqlBody = JSON.parse(secondCallInit.body);
      expect(gqlBody.variables.discountCodes).toEqual(["KEEP"]);
    });

    it("handles add-to-cart via FormData with merchandiseId", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse(
          { cartCreate: { cart: MOCK_CART, userErrors: [] } },
          {
            "server-timing": '_y;desc="unique", _s;desc="visit"',
            "set-cookie": "_shopify_y=unique; Path=/; Secure",
          },
        ),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          {
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: "1",
          },
          { referer: "https://my-app.com/products/widget" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("set-cookie")).toContain("cart=");
      expect(result.headers.get("set-cookie")).toContain("_shopify_y=unique");
      expect(result.headers.get("server-timing")).toBe('_y;desc="unique", _s;desc="visit"');
    });

    it("FormData intent=add without cart cookie creates cart and sets cookie", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          {
            intent: "add",
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: "1",
          },
          { referer: "https://my-app.com/products/widget" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("set-cookie")).toContain("cart=");
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/products/widget`);
    });

    it("FormData intent=add with existing cart cookie calls cartLinesAdd", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesAdd: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          {
            intent: "add",
            merchandiseId: "gid://shopify/ProductVariant/42",
            quantity: "2",
          },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/products/widget",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);
      expect(result.headers.get("set-cookie")).toBeNull();

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/123");
      expect(gqlBody.variables.lines).toEqual([
        { merchandiseId: "gid://shopify/ProductVariant/42", quantity: 2 },
      ]);
    });

    it("FormData add with sellingPlanId passes it to SFAPI", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          {
            intent: "add",
            merchandiseId: "gid://shopify/ProductVariant/42",
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
          { referer: "https://my-app.com/products/widget" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.input.lines[0].sellingPlanId).toBe("gid://shopify/SellingPlan/1");
    });

    it("FormData implicit add with sellingPlanId passes it through", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          {
            merchandiseId: "gid://shopify/ProductVariant/42",
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
          { referer: "https://my-app.com/products/widget" },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.status).toBe(303);

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.input.lines[0].sellingPlanId).toBe("gid://shopify/SellingPlan/1");
    });
  });

  describe("open redirect protection", () => {
    it("redirects to pathname only for same-origin Referer", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "remove", lineId: "gid://shopify/CartLine/1" },
          {
            cookies: "cart=123",
            referer: "https://my-app.com/cart?page=2",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/cart?page=2`);
    });

    it("redirects to / for cross-origin Referer", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "remove", lineId: "gid://shopify/CartLine/1" },
          {
            cookies: "cart=123",
            referer: "https://evil.com/phishing",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/`);
    });

    it("redirects to / for malformed Referer", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesRemove: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createFormPostRequest(
          { intent: "remove", lineId: "gid://shopify/CartLine/1" },
          {
            cookies: "cart=123",
            referer: "not-a-valid-url",
          },
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/`);
    });
  });

  describe("cookies", () => {
    it("sets Set-Cookie on cart creation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest({
          lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
        }),
        defaultConfig,
      );

      assert(result, "expected a response");
      const cookie = result.headers.get("set-cookie");
      assert(cookie, "expected Set-Cookie header");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Max-Age=1209600");
    });

    it("does not re-set cookie when cookie cart ID is unchanged", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesAdd: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("set-cookie")).toBeNull();
    });

    it("updates cookie when cookie cart ID changes after mutation", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartLinesAdd: {
            cart: { ...MOCK_CART, id: "gid://shopify/Cart/456" },
            userErrors: [],
          },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("set-cookie")).toContain("cart=456");
    });

    it("updates cookie when body cartId matches cookie cart ID after normalization", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({
          cartLinesAdd: {
            cart: { ...MOCK_CART, id: "gid://shopify/Cart/456" },
            userErrors: [],
          },
        }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          {
            cartId: "123",
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
          },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("set-cookie")).toContain("cart=456");

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.cartId).toBe("gid://shopify/Cart/123");
    });

    it("does not set cookie when body cartId differs from cookie cart ID", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartLinesAdd: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          {
            cartId: "gid://shopify/Cart/body-cart",
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
          },
          "cart=123",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("set-cookie")).toBeNull();
    });

    it("ignores POST cartId query param and creates a cart when no body cartId or cookie exists", async () => {
      mockFetch.mockResolvedValueOnce(
        mockGqlResponse({ cartCreate: { cart: MOCK_CART, userErrors: [] } }),
      );

      const result = await handleCartRequest(
        createJsonPostRequest(
          {
            lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
          },
          undefined,
          "https://my-app.com/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fquery-cart",
        ),
        defaultConfig,
      );

      assert(result, "expected a response");
      expect(result.headers.get("set-cookie")).toContain("cart=");

      const [, init] = mockFetch.mock.calls[0];
      const gqlBody = JSON.parse(init.body);
      expect(gqlBody.variables.input.lines).toEqual([
        { merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 },
      ]);
    });
  });
});
