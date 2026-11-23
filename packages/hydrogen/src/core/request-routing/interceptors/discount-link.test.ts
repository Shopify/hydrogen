import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../../client/client";
import type { CustomerSession } from "../../../customer-account/session";
import { createCartServerHandlers } from "../../cart/server-handlers";
import { configureLogging } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleShopifyRoutes } from "../handle-shopify-routes";
import type { ShopifyRouteHandlerGroup } from "../route-types";
import { handleDiscountLinkRedirect } from "./discount-link";

const ORIGIN = "https://my-app.com";
const EXISTING_CART_ID = "gid://shopify/Cart/existing";
const CREATED_CART_ID = "gid://shopify/Cart/created";
const CREATED_CART_COOKIE = "cart=created; Path=/; SameSite=Lax; Max-Age=1209600";
const LOCALE_VARIABLES = { country: "US", language: "EN" };

function createOptions(
  request: Request,
  handlers: ShopifyRouteHandlerGroup[] = [createCartServerHandlers()],
) {
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
    handlers,
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

function createLoggedInCustomerSession(accessToken: string): CustomerSession {
  return {
    getAccessToken: vi.fn().mockResolvedValue(accessToken),
    getOrRefreshAccessToken: vi.fn().mockResolvedValue(accessToken),
    prepareLoginUrl: vi.fn(),
    handleOAuthCallback: vi.fn(),
    logout: vi.fn(),
    isLoggedIn: vi.fn().mockResolvedValue(true),
  } as unknown as CustomerSession;
}

function discountRequest(path: string, init: RequestInit & { cartCookie?: string } = {}) {
  const { cartCookie, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (cartCookie) headers.set("cookie", `cart=${cartCookie}`);
  return new Request(`${ORIGIN}${path}`, { ...requestInit, headers });
}

function interceptDiscountLink(request: Request, handlers?: ShopifyRouteHandlerGroup[]) {
  return handleDiscountLinkRedirect(new URL(request.url), createOptions(request, handlers));
}

async function resolveDiscountLink(request: Request, handlers?: ShopifyRouteHandlerGroup[]) {
  const result = interceptDiscountLink(request, handlers);
  assert(result, "discount link interceptor should match");
  return result;
}

function expectRedirect(response: Response, path: string, cookies: string[] = []) {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`${ORIGIN}${path}`);
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.getSetCookie()).toEqual(cookies);
}

function gqlResponse(body: unknown, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify(body), { status: 200, headers: responseHeaders });
}

function cartData(discountCodes: string[]) {
  return gqlResponse({
    data: {
      cart: { id: EXISTING_CART_ID, discountCodes: discountCodes.map((code) => ({ code })) },
    },
  });
}

function cartCreateData(userErrors: Array<{ message: string }> = [], headers?: HeadersInit) {
  return gqlResponse(
    { data: { cartCreate: { cart: { id: CREATED_CART_ID }, userErrors, warnings: [] } } },
    headers,
  );
}

function discountUpdateData(userErrors: Array<{ message: string }> = []) {
  return gqlResponse({
    data: {
      cartDiscountCodesUpdate: { cart: { id: EXISTING_CART_ID }, userErrors, warnings: [] },
    },
  });
}

describe("handleDiscountLinkRedirect", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let logger: ReturnType<typeof createTestLogger>;

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
    logger = createTestLogger();
    configureLogging({ logger });
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

  it("leaves discount links to the app when no cart handlers are registered", () => {
    expect(interceptDiscountLink(discountRequest("/discount/SUMMER20"), [])).toBeNull();
  });

  it("rejects POST with 405 without calling the Storefront API", async () => {
    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20", { method: "POST", cartCookie: "existing" }),
    );

    expect(response.status).toBe(405);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("redirects HEAD without applying the code", async () => {
    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20?redirect=/products/tee", { method: "HEAD" }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expectRedirect(response, "/products/tee");
  });

  it("creates a cart with the code when there is no cart cookie", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    const response = await resolveDiscountLink(discountRequest("/discount/SUMMER20"));

    expect(sentOperations()).toEqual([
      {
        operation: "CartCreate",
        variables: { input: { discountCodes: ["SUMMER20"] }, ...LOCALE_VARIABLES },
      },
    ]);
    expectRedirect(response, "/", [CREATED_CART_COOKIE]);
  });

  it("attaches the logged-in customer to the cart it creates", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());
    const handlers = [
      createCartServerHandlers({ customerSession: createLoggedInCustomerSession("token") }),
    ];

    await resolveDiscountLink(discountRequest("/discount/SUMMER20"), handlers);

    expect(sentOperations()[0]?.variables).toEqual({
      input: { discountCodes: ["SUMMER20"], buyerIdentity: { customerAccessToken: "token" } },
      ...LOCALE_VARIABLES,
    });
  });

  it("leaves Storefront API cookies to the request context's cookie policy", async () => {
    mockFetch.mockResolvedValueOnce(
      cartCreateData([], { "set-cookie": "_shopify_essential=abc; Path=/" }),
    );

    const response = await resolveDiscountLink(discountRequest("/discount/SUMMER20"));

    expectRedirect(response, "/", [CREATED_CART_COOKIE]);
  });

  it("merges the code into the existing cart's codes", async () => {
    mockFetch.mockResolvedValueOnce(cartData(["A"])).mockResolvedValueOnce(discountUpdateData());

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20", { cartCookie: "existing" }),
    );

    expect(sentOperations()).toEqual([
      { operation: "Cart", variables: { id: EXISTING_CART_ID, ...LOCALE_VARIABLES } },
      {
        operation: "CartDiscountCodesUpdate",
        variables: {
          cartId: EXISTING_CART_ID,
          discountCodes: ["A", "SUMMER20"],
          ...LOCALE_VARIABLES,
        },
      },
    ]);
    expectRedirect(response, "/");
  });

  it("skips the mutation when the cart already holds the code in another case", async () => {
    mockFetch.mockResolvedValueOnce(cartData(["summer20"]));

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20?redirect=/products/tee", { cartCookie: "existing" }),
    );

    expect(sentOperations().map(({ operation }) => operation)).toEqual(["Cart"]);
    expectRedirect(response, "/products/tee");
  });

  it("creates a new cart when the cookie's cart no longer exists", async () => {
    mockFetch
      .mockResolvedValueOnce(gqlResponse({ data: { cart: null } }))
      .mockResolvedValueOnce(cartCreateData());

    const response = await resolveDiscountLink(
      discountRequest("/discount/SUMMER20", { cartCookie: "existing" }),
    );

    expect(sentOperations().map(({ operation }) => operation)).toEqual(["Cart", "CartCreate"]);
    expectRedirect(response, "/", [CREATED_CART_COOKIE]);
  });

  it("ignores the cartId query param and reads the cart from the cookie only", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    await resolveDiscountLink(
      discountRequest("/discount/SUMMER20?cartId=gid://shopify/Cart/from-param"),
    );

    expect(sentOperations().map(({ operation }) => operation)).toEqual(["CartCreate"]);
  });

  it("decodes a percent-encoded code", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());

    await resolveDiscountLink(discountRequest("/discount/SUMMER%2020"));

    expect(sentOperations()[0]?.variables).toEqual({
      input: { discountCodes: ["SUMMER 20"] },
      ...LOCALE_VARIABLES,
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
    it.each([
      {
        name: "a GraphQL error on the cart query",
        cartCookie: "existing",
        mockResponses: () => {
          mockFetch.mockResolvedValueOnce(
            gqlResponse({ data: null, errors: [{ message: "Throttled" }] }),
          );
        },
        operations: ["Cart"],
      },
      {
        name: "a thrown fetch",
        cartCookie: undefined,
        mockResponses: () => {
          mockFetch.mockRejectedValueOnce(new TypeError("network down"));
        },
        operations: ["CartCreate"],
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
          expect.objectContaining({ scope: "cart-api", error: expect.any(Error) }),
        );
        expectRedirect(response, "/products/tee");
      },
    );

    it("warns about userErrors from cartDiscountCodesUpdate and still redirects", async () => {
      mockFetch
        .mockResolvedValueOnce(cartData(["A"]))
        .mockResolvedValueOnce(discountUpdateData([{ message: "Cart is locked" }]));

      const response = await resolveDiscountLink(
        discountRequest("/discount/SUMMER20?redirect=/products/tee", { cartCookie: "existing" }),
      );

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("discount link code was rejected", {
        scope: "cart-api",
        userErrors: ["Cart is locked"],
      });
      expectRedirect(response, "/products/tee");
    });
  });

  it("is registered with handleShopifyRoutes", async () => {
    mockFetch.mockResolvedValueOnce(cartCreateData());
    const request = discountRequest("/discount/SUMMER20?redirect=/products/tee");

    const response = await handleShopifyRoutes(createOptions(request));

    assert(response, "handleShopifyRoutes should handle discount links");
    expectRedirect(response, "/products/tee", [CREATED_CART_COOKIE]);
    expect(sentOperations().map(({ operation }) => operation)).toEqual(["CartCreate"]);
  });
});
