import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createShopifyRequestContext } from "../headers";
import { handleCheckoutRedirect as handleCheckoutRedirectImpl } from "./checkout";

type TestStorefrontConfig = {
  storeDomain: string;
};

const DEFAULT_I18N = { country: "US", language: "EN", pathPrefix: "" } as const;

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "test-store.myshopify.com",
};

const MOCK_CART = {
  id: "gid://shopify/Cart/123",
  checkoutUrl: "https://test-store.myshopify.com/checkouts/cn/abc?key=value",
  totalQuantity: 1,
  note: "",
  cost: { totalAmount: { amount: "10.00", currencyCode: "USD" } },
  lines: { nodes: [] },
  discountCodes: [],
};

function mockGqlResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createPrivateStorefrontClient(
  request: Request,
  fixture: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n: DEFAULT_I18N }),
    config: {
      storeDomain: fixture.storeDomain,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handleCheckoutRedirect(request: Request, fixture: TestStorefrontConfig = defaultConfig) {
  const storefrontClient = createPrivateStorefrontClient(request, fixture);
  return handleCheckoutRedirectImpl({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
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

describe("handleCheckoutRedirect", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null for unrelated routes", async () => {
    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/products/snowboard"),
      defaultConfig,
    );

    expect(result).toBeNull();
  });

  it("returns null for non-cart-permalink subroutes", async () => {
    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/cart/recommendations"),
      defaultConfig,
    );

    expect(result).toBeNull();
  });

  it("redirects checkout mode to the current cart checkout URL", async () => {
    mockFetch.mockResolvedValueOnce(mockGqlResponse({ cart: MOCK_CART }));

    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/checkout?payment=shop_pay&source=hydrogen", {
        headers: { cookie: "cart=123" },
      }),
      defaultConfig,
    );

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe(
      "https://test-store.myshopify.com/checkouts/cn/abc?key=value&payment=shop_pay&source=hydrogen",
    );
  });

  it("redirects checkout mode to the root route without a cart", async () => {
    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/checkout?payment=shop_pay"),
      defaultConfig,
    );

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe("https://my-app.com/");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("redirects checkout mode to the root route when the cart has no checkout URL", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGqlResponse({
        cart: {
          ...MOCK_CART,
          checkoutUrl: null,
        },
      }),
    );

    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/checkout?payment=shop_pay", {
        headers: { cookie: "cart=123" },
      }),
      defaultConfig,
    );

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe("https://my-app.com/");
  });

  it("returns 502 when checkout mode cannot load the cart", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/checkout?payment=shop_pay", {
        headers: { cookie: "cart=123" },
      }),
      defaultConfig,
    );

    expect(result?.status).toBe(502);
    expect(await result?.json()).toEqual({ error: "SFAPI request failed" });
    consoleSpy.mockRestore();
  });

  it("redirects variant cart permalinks to the configured store domain", async () => {
    const result = await handleCheckoutRedirect(
      new Request(
        "https://my-app.com/cart/123:2,456:1?discount=SAVE10&payment=shop_pay&source=hydrogen",
      ),
      defaultConfig,
    );

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe(
      "https://test-store.myshopify.com/cart/123:2,456:1?discount=SAVE10&payment=shop_pay&source=hydrogen",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("merges checkout URL search params into variant cart permalinks when a cart exists", async () => {
    mockFetch.mockResolvedValueOnce(
      mockGqlResponse({
        cart: {
          ...MOCK_CART,
          checkoutUrl:
            "https://test-store.myshopify.com/checkouts/cn/abc?_shopify_y=unique&_shopify_s=visit&discount=OLD",
        },
      }),
    );

    const result = await handleCheckoutRedirect(
      new Request(
        "https://my-app.com/cart/123:2?discount=SAVE10&payment=shop_pay&source=hydrogen",
        {
          headers: { cookie: "cart=123" },
        },
      ),
      defaultConfig,
    );

    expect(result?.headers.get("location")).toBe(
      "https://test-store.myshopify.com/cart/123:2?_shopify_y=unique&_shopify_s=visit&discount=OLD&payment=shop_pay&source=hydrogen",
    );
  });

  it("still redirects variant cart permalinks when cart tracking params cannot be loaded", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/cart/123:2?payment=shop_pay", {
        headers: { cookie: "cart=123" },
      }),
      defaultConfig,
    );

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe(
      "https://test-store.myshopify.com/cart/123:2?payment=shop_pay",
    );
    consoleSpy.mockRestore();
  });

  it("sets shop_pay as the default payment option when missing", async () => {
    const result = await handleCheckoutRedirect(
      new Request("https://my-app.com/cart/123:1?source=hydrogen"),
      defaultConfig,
    );

    expect(result?.headers.get("location")).toBe(
      "https://test-store.myshopify.com/cart/123:1?source=hydrogen&payment=shop_pay",
    );
  });
});
