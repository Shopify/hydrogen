import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../../client/client";
import { configureLogging } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleShopifyRoutes } from "../handle-shopify-routes";
import { handleDiscountLinkRedirect } from "./discount-link";

const ORIGIN = "https://my-app.com";
const EXISTING_CART_ID = "gid://shopify/Cart/existing";
const CREATED_CART_ID = "gid://shopify/Cart/created";
const CREATED_CART_COOKIE = "cart=created; Path=/; SameSite=Lax; Max-Age=1209600";

function createOptions(request: Request) {
  const storefrontClient = createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({
      request,
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      buyerIp: "127.0.0.1",
    }),
    config: {
      storeDomain: "test-store.myshopify.com",
      privateStorefrontToken: "test-private-token",
    },
  });

  return {
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
  };
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

function discountRequest(path: string, init: RequestInit & { cartCookie?: string } = {}) {
  const { cartCookie, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (cartCookie) headers.set("cookie", `cart=${cartCookie}`);
  return new Request(`${ORIGIN}${path}`, { ...requestInit, headers });
}

function interceptDiscountLink(request: Request) {
  return handleDiscountLinkRedirect(new URL(request.url), createOptions(request));
}

async function resolveDiscountLink(request: Request) {
  const result = interceptDiscountLink(request);
  assert(result, "discount link interceptor should match");
  return result;
}

function expectRedirect(response: Response, path: string, cookies: string[] = []) {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`${ORIGIN}${path}`);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.getSetCookie()).toEqual(cookies);
}

function gqlResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function cartData(discountCodes: string[]) {
  return gqlResponse({
    data: {
      cart: { id: EXISTING_CART_ID, discountCodes: discountCodes.map((code) => ({ code })) },
    },
  });
}

function cartCreateData() {
  return gqlResponse({
    data: { cartCreate: { cart: { id: CREATED_CART_ID }, userErrors: [] } },
  });
}

function discountUpdateData() {
  return gqlResponse({
    data: { cartDiscountCodesUpdate: { cart: { id: EXISTING_CART_ID }, userErrors: [] } },
  });
}

describe("handleDiscountLinkRedirect", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  function sentOperations(): Array<{ operation: string; variables: unknown }> {
    return mockFetch.mock.calls.map(([, init]) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        query: string;
        variables: unknown;
      };
      const operation = body.query.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "unknown";
      return { operation, variables: body.variables };
    });
  }

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    configureLogging({});
    vi.unstubAllGlobals();
  });

  it.each(["/discount", "/discount/", "/discount/a/b", "/discounts/x", "/products/tee"])(
    "returns null for %s",
    (path) => {
      expect(interceptDiscountLink(discountRequest(path))).toBeNull();
    },
  );

  it.each(["POST", "HEAD"])(
    "rejects %s with 405 without calling the Storefront API",
    async (method) => {
      const response = await resolveDiscountLink(
        discountRequest("/discount/SUMMER20", { method, cartCookie: "existing" }),
      );

      expect(response.status).toBe(405);
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("creates a cart with the code when there is no cart cookie", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    const response = await resolveDiscountLink(discountRequest("/discount/SUMMER20"));

    expect(sentOperations()).toEqual([
      {
        operation: "DiscountLinkCartCreate",
        variables: { discountCodes: ["SUMMER20"], country: "US", language: "EN" },
      },
    ]);
    expectRedirect(response, "/", [CREATED_CART_COOKIE]);
  });

  it("merges the code into the existing cart's codes", async () => {
    mockFetch.mockResolvedValueOnce(cartData(["A"])).mockResolvedValueOnce(discountUpdateData());

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20", { cartCookie: "existing" }),
    );

    expect(sentOperations()).toEqual([
      { operation: "DiscountLinkCart", variables: { id: EXISTING_CART_ID } },
      {
        operation: "DiscountLinkCartDiscountCodesUpdate",
        variables: { cartId: EXISTING_CART_ID, discountCodes: ["A", "SUMMER20"] },
      },
    ]);
    expectRedirect(response, "/");
  });

  it("skips the mutation when the cart already holds the code in another case", async () => {
    mockFetch.mockResolvedValueOnce(cartData(["summer20"]));

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20?redirect=/products/tee", { cartCookie: "existing" }),
    );

    expect(sentOperations()).toEqual([
      { operation: "DiscountLinkCart", variables: { id: EXISTING_CART_ID } },
    ]);
    expectRedirect(response, "/products/tee");
  });

  it("creates a new cart when the cookie's cart no longer exists", async () => {
    mockFetch
      .mockResolvedValueOnce(gqlResponse({ data: { cart: null } }))
      .mockResolvedValueOnce(cartCreateData());

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20", { cartCookie: "existing" }),
    );

    expect(sentOperations()).toEqual([
      { operation: "DiscountLinkCart", variables: { id: EXISTING_CART_ID } },
      {
        operation: "DiscountLinkCartCreate",
        variables: { discountCodes: ["SUMMER20"], country: "US", language: "EN" },
      },
    ]);
    expectRedirect(response, "/", [CREATED_CART_COOKIE]);
  });

  it("ignores the cartId query param and reads the cart from the cookie only", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    await resolveDiscountLink(
      discountRequest("/discount/SUMMER20?cartId=gid://shopify/Cart/from-param"),
    );

    expect(sentOperations().map(({ operation }) => operation)).toEqual(["DiscountLinkCartCreate"]);
  });

  it("decodes a percent-encoded code", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    await resolveDiscountLink(discountRequest("/discount/SUMMER%2020"));

    expect(sentOperations()[0]?.variables).toEqual({
      discountCodes: ["SUMMER 20"],
      country: "US",
      language: "EN",
    });
  });

  it.each(["/discount/%E0%A4%A", "/discount/%20%20"])(
    "redirects %s without calling the Storefront API",
    async (path) => {
      const response = await resolveDiscountLink(discountRequest(`${path}?redirect=/products/tee`));

      expect(mockFetch).not.toHaveBeenCalled();
      expectRedirect(response, "/products/tee");
    },
  );

  describe("redirect location", () => {
    beforeEach(() => {
      mockFetch.mockImplementation(() => Promise.resolve(cartCreateData()));
    });

    it.each([
      ["?redirect=/products/tee", "/products/tee"],
      ["?return_to=/collections/all", "/collections/all"],
      ["?redirect=/products/tee&return_to=/collections/all", "/products/tee"],
      ["?redirect=&return_to=/collections/all", "/collections/all"],
      [`?redirect=${encodeURIComponent(`${ORIGIN}/products/tee`)}`, "/products/tee"],
      ["?redirect=https://evil.example/x", "/"],
      ["?redirect=//evil.example", "/"],
      ["?redirect=/x/..//evil.example", "/"],
      ["?redirect=https:evil.example/p", "/"],
      ["?redirect=/products/tee&utm_source=email", "/products/tee?utm_source=email"],
      ["?utm_source=email&utm_source=sms", "/?utm_source=email&utm_source=sms"],
      [
        `?redirect=${encodeURIComponent("/products/tee?variant=1&utm_source=site")}&utm_source=email&utm_medium=mail`,
        "/products/tee?variant=1&utm_source=site&utm_medium=mail",
      ],
    ])("%s redirects to %s", async (search, expectedPath) => {
      const response = await resolveDiscountLink(discountRequest(`/discount/SUMMER20${search}`));

      expectRedirect(response, expectedPath, [CREATED_CART_COOKIE]);
    });
  });

  describe("when applying the code fails", () => {
    let logger: ReturnType<typeof createTestLogger>;

    beforeEach(() => {
      logger = createTestLogger();
      configureLogging({ logger });
    });

    it.each([
      {
        name: "a GraphQL error on the cart query",
        cartCookie: "existing",
        mockResponses: () => {
          mockFetch.mockResolvedValueOnce(
            gqlResponse({ data: null, errors: [{ message: "Throttled" }] }),
          );
        },
        operations: ["DiscountLinkCart"],
      },
      {
        name: "userErrors from cartDiscountCodesUpdate",
        cartCookie: "existing",
        mockResponses: () => {
          mockFetch.mockResolvedValueOnce(cartData(["A"])).mockResolvedValueOnce(
            gqlResponse({
              data: {
                cartDiscountCodesUpdate: {
                  cart: null,
                  userErrors: [{ message: "Cart is locked" }],
                },
              },
            }),
          );
        },
        operations: ["DiscountLinkCart", "DiscountLinkCartDiscountCodesUpdate"],
      },
      {
        name: "userErrors from cartCreate",
        cartCookie: undefined,
        mockResponses: () => {
          mockFetch.mockResolvedValueOnce(
            gqlResponse({
              data: {
                cartCreate: { cart: { id: CREATED_CART_ID }, userErrors: [{ message: "No" }] },
              },
            }),
          );
        },
        operations: ["DiscountLinkCartCreate"],
      },
      {
        name: "a thrown fetch",
        cartCookie: undefined,
        mockResponses: () => {
          mockFetch.mockRejectedValueOnce(new TypeError("network down"));
        },
        operations: ["DiscountLinkCartCreate"],
      },
    ])(
      "logs $name and still redirects without a cookie",
      async ({ cartCookie, mockResponses, operations }) => {
        mockResponses();

        const response = await resolveDiscountLink(
          discountRequest("/discount/SUMMER20?redirect=/products/tee", { cartCookie }),
        );

        expect(sentOperations().map(({ operation }) => operation)).toEqual(operations);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          "discount link could not apply code",
          expect.objectContaining({ scope: "discount-link", error: expect.any(Error) }),
        );
        expectRedirect(response, "/products/tee");
      },
    );
  });

  it("is registered with handleShopifyRoutes", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());
    const request = discountRequest("/discount/SUMMER20?redirect=/products/tee");

    const response = await handleShopifyRoutes(createOptions(request));

    assert(response, "handleShopifyRoutes should handle discount links");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/products/tee`);
    expect(response.headers.getSetCookie()).toContain(CREATED_CART_COOKIE);
    expect(sentOperations().map(({ operation }) => operation)).toEqual(["DiscountLinkCartCreate"]);
  });
});
