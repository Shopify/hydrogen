import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { STOREFRONT_PRIVATE_TOKEN_HEADER } from "../headers";
import { configureLogging } from "../logging";
import { createShopifyRequestContext } from "../request-context";
import { handleShopifyRoutes } from "../request-routing/handle-shopify-routes";
import { assert, createTestLogger } from "../test-utils";
import { createCartServerHandlers } from "./server-handlers";

const STORE_DOMAIN = "https://test-store.myshopify.com";
const SESSION_COOKIE = "_shopify_analytics=a; _shopify_essential=old";
const ASSIGNED_ESSENTIAL = "_shopify_essential=new; Path=/; HttpOnly; Secure; SameSite=Lax";
const ASSIGNED_ANALYTICS = "_shopify_analytics=b; Path=/; Secure";
const STALE_ESSENTIAL = "_shopify_essential=stale; Path=/";
const ASSIGNED_MARKER =
  "_shopify_rollouts_assigned=1; Max-Age=1800; Path=/; HttpOnly; Secure; SameSite=Lax";
const ADD_LINES = { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] };
const CART = { id: "gid://shopify/Cart/123", checkoutUrl: `${STORE_DOMAIN}/checkout` };
const I18N = { defaultLocale: { country: "US", language: "EN" } } as const;

function postRequest(body: unknown, cookie?: string): Request {
  return new Request("https://my-app.com/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, setCookies: string[] = [], status = 200): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const setCookie of setCookies) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function assignResponse(setCookies: string[] = [ASSIGNED_ESSENTIAL]): Response {
  return jsonResponse({ data: { rolloutsAssign: { userErrors: [] } } }, setCookies);
}

function cartResponse(mutation: string, setCookies: string[] = []): Response {
  return jsonResponse(
    { data: { [mutation]: { cart: CART, userErrors: [], warnings: [] } } },
    setCookies,
  );
}

function handleCartPost(
  request: Request,
  options: { assignRollouts?: boolean; rateLimitHandling?: "response" } = { assignRollouts: true },
  clientType: "private" | "public" = "private",
  routeRateLimitHandling?: "response",
) {
  const storefrontClient =
    clientType === "private"
      ? createStorefrontClient({
          type: "private",
          requestContext: createShopifyRequestContext({
            request,
            i18n: I18N,
            buyerIp: "127.0.0.1",
          }),
          config: { storeDomain: STORE_DOMAIN, privateStorefrontToken: "private-token" },
        })
      : createStorefrontClient({
          type: "public",
          requestContext: createShopifyRequestContext({ request, i18n: I18N }),
          config: { storeDomain: STORE_DOMAIN, publicStorefrontToken: "public-token" },
        });
  const response = handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    storefrontClient,
    handlers: [createCartServerHandlers(options)],
    rateLimitHandling: routeRateLimitHandling,
  });
  assert(response, "expected the cart route to match");
  return response;
}

function storefrontCall(index: number) {
  const call = mockFetch.mock.calls[index];
  assert(call, `expected Storefront API call ${index}`);
  const [url, init] = call as [string, RequestInit & { headers: Headers; body: string }];
  return { url, query: JSON.parse(init.body).query as string, headers: init.headers };
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  configureLogging({});
  vi.restoreAllMocks();
});

describe("createCartServerHandlers with assignRollouts", () => {
  it("does not assign without the option", async () => {
    mockFetch.mockResolvedValueOnce(cartResponse("cartCreate"));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE), {});

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain("cartCreate");
  });

  it("assigns before creating a cart and sends the assigned session cookie on the cart write", async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse([ASSIGNED_ESSENTIAL, ASSIGNED_ANALYTICS]))
      .mockResolvedValueOnce(cartResponse("cartCreate", ["_shopify_essential=newer; Path=/"]));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    const assign = storefrontCall(0);
    expect(assign.url).toBe(`${STORE_DOMAIN}/api/unstable/graphql.json`);
    expect(assign.query).toContain("rolloutsAssign");
    expect(assign.headers.get(STOREFRONT_PRIVATE_TOKEN_HEADER)).toBe("private-token");
    expect(assign.headers.get("cookie")).toBe(SESSION_COOKIE);

    const cartWrite = storefrontCall(1);
    expect(cartWrite.url).not.toContain("unstable");
    expect(cartWrite.query).toContain("cartCreate");
    expect(cartWrite.headers.get("cookie")).toBe("_shopify_analytics=a; _shopify_essential=new");

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      ASSIGNED_ESSENTIAL,
      ASSIGNED_ANALYTICS,
      ASSIGNED_MARKER,
      "_shopify_essential=newer; Path=/",
      expect.stringMatching(/^cart=123;/),
    ]);
  });

  it("assigns before adding lines to an existing cart", async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(cartResponse("cartLinesAdd"));

    const response = await handleCartPost(
      postRequest(ADD_LINES, "cart=123; _shopify_essential=old; _shopify_marketing=m"),
    );

    expect(response.status).toBe(200);
    expect(storefrontCall(0).query).toContain("rolloutsAssign");
    const cartWrite = storefrontCall(1);
    expect(cartWrite.query).toContain("cartLinesAdd");
    expect(cartWrite.headers.get("cookie")).toBe(
      "cart=123; _shopify_marketing=m; _shopify_essential=new",
    );
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_ESSENTIAL, ASSIGNED_MARKER]);
  });

  it.each([
    ["update", { lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }] }, "cartLinesUpdate"],
    ["remove", { lines: [{ id: "gid://shopify/CartLine/1", quantity: 0 }] }, "cartLinesRemove"],
    ["discount", { discountCodes: ["SAVE10"] }, "cartDiscountCodesUpdate"],
    ["note", { note: "Gift wrap" }, "cartNoteUpdate"],
    ["attributes", { attributes: [{ key: "gift", value: "yes" }] }, "cartAttributesUpdate"],
  ])("does not assign before a %s", async (_intent, body, mutation) => {
    mockFetch.mockResolvedValueOnce(cartResponse(mutation));

    const response = await handleCartPost(postRequest(body, `cart=123; ${SESSION_COOKIE}`));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain(mutation);
  });

  it("does not assign with a public client", async () => {
    mockFetch.mockResolvedValueOnce(cartResponse("cartCreate"));

    const response = await handleCartPost(
      postRequest(ADD_LINES, SESSION_COOKIE),
      { assignRollouts: true },
      "public",
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain("cartCreate");
  });

  it.each([
    ["no cookies", undefined],
    ["only the assigned marker", "_shopify_rollouts_assigned=1"],
  ])(
    "assigns a buyer without a Shopify session and sends the new session with %s",
    async (_cookies, cookie) => {
      mockFetch
        .mockResolvedValueOnce(assignResponse())
        .mockResolvedValueOnce(cartResponse("cartCreate"));

      const response = await handleCartPost(postRequest(ADD_LINES, cookie));

      expect(storefrontCall(0).query).toContain("rolloutsAssign");
      expect(storefrontCall(0).headers.get("cookie")).toBe(cookie ?? null);
      expect(storefrontCall(1).headers.get("cookie")).toBe(
        cookie ? `${cookie}; _shopify_essential=new` : "_shopify_essential=new",
      );
      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie()).toEqual([
        ASSIGNED_ESSENTIAL,
        expect.stringMatching(/^cart=123;/),
      ]);
    },
  );

  it("skips the assignment for a buyer assigned in the last 30 minutes", async () => {
    mockFetch.mockResolvedValueOnce(cartResponse("cartCreate"));

    const response = await handleCartPost(
      postRequest(ADD_LINES, `${SESSION_COOKIE}; _shopify_rollouts_assigned=1`),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storefrontCall(0).query).toContain("cartCreate");
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^cart=123;/)]);
  });

  it.each([
    ["a network error", () => Promise.reject(new TypeError("fetch failed"))],
    ["a non-200 response", () => Promise.resolve(new Response("Bad gateway", { status: 502 }))],
    [
      "GraphQL errors",
      () =>
        Promise.resolve(
          jsonResponse({ errors: [{ message: "Field doesn't exist" }] }, [STALE_ESSENTIAL]),
        ),
    ],
    [
      "an assignment user error",
      () =>
        Promise.resolve(
          jsonResponse(
            {
              data: {
                rolloutsAssign: {
                  userErrors: [{ code: "ASSIGNMENT_FAILED", field: null, message: "Failed" }],
                },
              },
            },
            [STALE_ESSENTIAL],
          ),
        ),
    ],
  ])("still writes the cart after %s", async (_failure, assignResult) => {
    const logger = createTestLogger();
    configureLogging({ logger });
    mockFetch
      .mockImplementationOnce(assignResult)
      .mockResolvedValueOnce(cartResponse("cartCreate"));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(response.status).toBe(200);
    expect(storefrontCall(0).query).toContain("rolloutsAssign");
    const cartWrite = storefrontCall(1);
    expect(cartWrite.query).toContain("cartCreate");
    expect(cartWrite.headers.get("cookie")).toBe(SESSION_COOKIE);
    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^cart=123;/)]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("still writes the cart when the assignment times out after one second", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const controller = new AbortController();
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((ms) => (ms === 1_000 ? controller.signal : timeout(ms)));
    mockFetch
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init.signal;
            assert(signal, "expected an abort signal");
            signal.addEventListener("abort", () => reject(signal.reason));
            controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
          }),
      )
      .mockResolvedValueOnce(cartResponse("cartCreate"));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(timeoutSpy).toHaveBeenCalledWith(1_000);
    expect(response.status).toBe(200);
    expect(storefrontCall(1).headers.get("cookie")).toBe(SESSION_COOKIE);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it.each([
    ["responds with an error", () => new Response("Internal error", { status: 500 })],
    ["returns GraphQL errors", () => jsonResponse({ errors: [{ message: "Throttled" }] })],
  ])("forwards the assignment cookies when the cart write %s", async (_failure, cartResult) => {
    configureLogging({ logger: createTestLogger() });
    mockFetch.mockResolvedValueOnce(assignResponse()).mockResolvedValueOnce(cartResult());

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "cart_mutation_failed", message: "Cart mutation failed. Please try again." },
    });
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_ESSENTIAL, ASSIGNED_MARKER]);
  });

  it("forwards the assigned marker when the cart write fails after an assignment that set no session cookie", async () => {
    configureLogging({ logger: createTestLogger() });
    mockFetch
      .mockResolvedValueOnce(assignResponse([]))
      .mockResolvedValueOnce(new Response("Internal error", { status: 500 }));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("cart_mutation_failed");
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_MARKER]);
  });

  it("keeps the assignment cookies on a rate-limited cart write", async () => {
    configureLogging({ logger: createTestLogger() });
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(
        new Response("Throttled", { status: 429, headers: { "retry-after": "3" } }),
      );

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE), {
      assignRollouts: true,
      rateLimitHandling: "response",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3");
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_ESSENTIAL, ASSIGNED_MARKER]);
  });

  it("lets the router answer a rate-limited cart write with the assignment cookies", async () => {
    configureLogging({ logger: createTestLogger() });
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(
        new Response("Throttled", { status: 429, headers: { "retry-after": "3" } }),
      );

    const response = await handleCartPost(
      postRequest(ADD_LINES, SESSION_COOKIE),
      { assignRollouts: true },
      "private",
      "response",
    );

    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("rate_limited");
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_ESSENTIAL]);
  });

  it("lets the router answer a rate-limited cart write with the new session of a buyer without one", async () => {
    configureLogging({ logger: createTestLogger() });
    mockFetch
      .mockResolvedValueOnce(assignResponse())
      .mockResolvedValueOnce(
        new Response("Throttled", { status: 429, headers: { "retry-after": "3" } }),
      );

    const response = await handleCartPost(
      postRequest(ADD_LINES),
      { assignRollouts: true },
      "private",
      "response",
    );

    expect(response.status).toBe(429);
    expect(response.headers.getSetCookie()).toEqual([ASSIGNED_ESSENTIAL]);
  });

  it("does not forward cookies from a failed assignment", async () => {
    configureLogging({ logger: createTestLogger() });
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, [ASSIGNED_ESSENTIAL], 500))
      .mockResolvedValueOnce(cartResponse("cartCreate", ["_shopify_essential=newer; Path=/"]));

    const response = await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(response.status).toBe(200);
    expect(storefrontCall(1).headers.get("cookie")).toBe(SESSION_COOKIE);
    expect(response.headers.getSetCookie()).toEqual([
      "_shopify_essential=newer; Path=/",
      expect.stringMatching(/^cart=123;/),
    ]);
  });

  it("does not send a cleared session cookie on the cart write", async () => {
    mockFetch
      .mockResolvedValueOnce(assignResponse(["_shopify_essential=; Max-Age=0; Path=/"]))
      .mockResolvedValueOnce(cartResponse("cartCreate"));

    await handleCartPost(postRequest(ADD_LINES, SESSION_COOKIE));

    expect(storefrontCall(1).headers.get("cookie")).toBe(SESSION_COOKIE);
  });
});
