import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { configureLogging } from "../logging";
import { handleShopifyRouteHandlers } from "../request-routing/registered-routes";
import { assert, createTestLogger } from "../test-utils";
import { createCartServerHandlers } from "./server-handlers";
import { EMPTY_CART_DATA, type CartData, type CartLine } from "./state";
import {
  createCartServerTransport,
  type CartReadResult,
  type CartTransport,
  type CartTransportContext,
  type CartWriteResult,
} from "./transport";

const NOW = Date.UTC(2026, 10, 9, 12, 0, 0);
const NOW_SECONDS = NOW / 1000;
const EXPIRES_AT = new Date(NOW + 10 * 86_400_000).toISOString();
const TEN_DAYS = 864_000;

const LINE = {
  id: "gid://shopify/CartLine/1",
  quantity: 1,
  merchandise: { id: "gid://shopify/ProductVariant/1" },
} as unknown as CartLine;

function cart(token: string, lines: CartLine[] = [LINE]): CartData {
  return {
    ...EMPTY_CART_DATA,
    id: `gid://shopify/Cart/${token}`,
    totalQuantity: lines.length,
    lines: { nodes: lines },
  };
}

const HOME_CART = cart("home?key=h");
const RAYCON_CART = cart("raycon-token?key=r");
const SKULL_CART = cart("skull-token?key=s");

type CartsBySeller = Record<string, CartReadResult | Error | undefined>;

function createTransport({
  sellers = true,
  reads = {},
  write,
}: {
  sellers?: boolean;
  reads?: CartsBySeller;
  write?: Partial<CartWriteResult>;
} = {}) {
  const transport = {
    ordering: "sequential",
    sellers,
    getCart: vi.fn(async (_payload: { cartId: string }, ctx: CartTransportContext) => {
      const result = reads[ctx.seller ?? "home"];
      if (result instanceof Error) throw result;
      return result ?? { cart: null, headers: new Headers() };
    }),
    updateCart: vi.fn(
      async (): Promise<CartWriteResult> => ({
        cart: RAYCON_CART,
        userErrors: [],
        warnings: [],
        headers: new Headers(),
        expiresAt: EXPIRES_AT,
        ...write,
      }),
    ),
  } satisfies CartTransport;
  return {
    transport,
    handlers: createCartServerHandlers({ transport: createCartServerTransport(transport) }),
  };
}

function read(cartData: CartData | null): CartReadResult {
  return { cart: cartData, headers: new Headers() };
}

const storefrontClient = {
  storeUrl: "https://shop.example.com",
  requestContext: {},
} as unknown as StorefrontClient;

function sellerCookie(seller: string, token: string, writtenAt = NOW_SECONDS - 60): string {
  return `hydrogen-cart.${seller}=${writtenAt}|${encodeURIComponent(token)}`;
}

function getRequest(url: string, cookie?: string): Request {
  return new Request(url, { headers: cookie ? { cookie } : {} });
}

function jsonPost(url: string, body: unknown, cookie?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

function formPost(url: string, fields: Record<string, string>, cookie?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: "https://app.example.com/products/a",
      ...(cookie && { cookie }),
    },
    body: new URLSearchParams(fields).toString(),
  });
}

function setCookies(result: { headers?: HeadersInit }): string[] {
  return new Headers(result.headers).getSetCookie();
}

function jsonData<TData>(result: { type: "json"; data: TData } | { type: string }): TData {
  if (result.type !== "json" || !("data" in result)) {
    throw new Error(`expected a json result, got ${result.type}`);
  }
  return result.data as TData;
}

const ADD = { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] };
const SELLER_URL = "https://app.example.com/api/cart?seller=raycon";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  configureLogging({});
});

describe("seller cart GET", () => {
  it("reads the seller's cart from its cookie through the seller context", async () => {
    const { transport, handlers } = createTransport({ reads: { raycon: read(RAYCON_CART) } });
    const cookie = `cart=home%3Fkey%3Dh; ${sellerCookie("raycon", "raycon-token?key=r")}`;

    const result = await handlers.get({
      request: getRequest(SELLER_URL, cookie),
      storefrontClient,
    });

    expect(transport.getCart).toHaveBeenCalledTimes(1);
    expect(transport.getCart).toHaveBeenCalledWith(
      { cartId: "gid://shopify/Cart/raycon-token?key=r" },
      { storefrontClient, seller: "raycon" },
    );
    expect(jsonData(result)).toEqual({ cart: RAYCON_CART, ordering: "sequential" });
    expect(setCookies(result)).toEqual([]);
  });

  it("returns a null cart without a seller cookie", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.get({
      request: getRequest(SELLER_URL, "cart=home%3Fkey%3Dh"),
      storefrontClient,
    });

    expect(transport.getCart).not.toHaveBeenCalled();
    expect(jsonData(result)).toEqual({ cart: null, ordering: "sequential" });
  });

  it("reads the seller and cookie from the request context without a request", async () => {
    const { transport, handlers } = createTransport({ reads: { raycon: read(RAYCON_CART) } });
    const client = {
      ...storefrontClient,
      requestContext: { url: SELLER_URL, cookie: sellerCookie("raycon", "raycon-token?key=r") },
    } as unknown as StorefrontClient;

    const result = await handlers.get({ storefrontClient: client });

    expect(transport.getCart).toHaveBeenCalledWith(expect.anything(), {
      storefrontClient: client,
      seller: "raycon",
    });
    expect(jsonData(result).cart).toEqual(RAYCON_CART);
  });

  it.each(["Raycon", "", "evil.com", "-x", "a".repeat(64)])(
    "returns invalid_seller for %j",
    async (seller) => {
      const { transport, handlers } = createTransport();
      const url = `https://app.example.com/api/cart?seller=${encodeURIComponent(seller)}`;

      const result = await handlers.get({ request: getRequest(url), storefrontClient });

      expect(result).toMatchObject({ type: "error", error: { code: "invalid_seller" } });
      expect(transport.getCart).not.toHaveBeenCalled();
    },
  );

  it("responds with status 400 for invalid_seller through the route", async () => {
    const { handlers } = createTransport();
    const request = getRequest("https://app.example.com/api/cart?seller=Bad.Handle");

    const response = await handleShopifyRouteHandlers(new URL(request.url), {
      request,
      storefrontClient,
      requestContext: storefrontClient.requestContext,
      handlers: [handlers],
    });

    assert(response, "expected the cart route to match");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "invalid_seller", message: expect.any(String) },
    });
  });
});

describe("GET with includeSellers", () => {
  it("returns the home cart and every seller cart, ignoring ?seller=", async () => {
    const { transport, handlers } = createTransport({
      reads: { home: read(HOME_CART), raycon: read(RAYCON_CART), skull: read(SKULL_CART) },
    });
    const cookie = [
      "cart=home%3Fkey%3Dh",
      sellerCookie("raycon", "raycon-token?key=r", NOW_SECONDS - 10),
      sellerCookie("skull", "skull-token?key=s", NOW_SECONDS - 5),
    ].join("; ");

    const result = await handlers.get({
      request: getRequest("https://app.example.com/products/a?seller=raycon", cookie),
      storefrontClient,
      includeSellers: true,
    });

    expect(result.data).toEqual({
      cart: HOME_CART,
      ordering: "sequential",
      sellers: [
        { seller: "skull", cart: SKULL_CART },
        { seller: "raycon", cart: RAYCON_CART },
      ],
    });
    expect(transport.getCart).toHaveBeenCalledWith(
      { cartId: "gid://shopify/Cart/home?key=h" },
      { storefrontClient },
    );
  });

  it("reads the home cart and seller carts in parallel", async () => {
    const pending: Array<() => void> = [];
    const { transport, handlers } = createTransport();
    transport.getCart.mockImplementation(
      (_payload, ctx) =>
        new Promise((resolve) => {
          pending.push(() => resolve(read(ctx.seller === "skull" ? SKULL_CART : RAYCON_CART)));
        }),
    );
    const cookie = [
      "cart=home%3Fkey%3Dh",
      sellerCookie("raycon", "raycon-token?key=r"),
      sellerCookie("skull", "skull-token?key=s"),
    ].join("; ");

    const result = handlers.get({
      request: getRequest("https://app.example.com/", cookie),
      storefrontClient,
      includeSellers: true,
    });
    await vi.waitFor(() => expect(transport.getCart).toHaveBeenCalledTimes(3));
    for (const resolve of pending) resolve();

    expect((await result).data.sellers).toHaveLength(2);
  });

  it("leaves out sellers whose cart fails, is gone, or has no lines, and warns on failures", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const error = new Error("seller down");
    const { handlers } = createTransport({
      reads: {
        raycon: read(RAYCON_CART),
        broken: error,
        gone: read(null),
        empty: read(cart("empty-token", [])),
      },
    });
    const cookie = [
      sellerCookie("raycon", "raycon-token?key=r"),
      sellerCookie("broken", "b"),
      sellerCookie("gone", "g"),
      sellerCookie("empty", "e"),
    ].join("; ");

    const result = await handlers.get({
      request: getRequest("https://app.example.com/", cookie),
      storefrontClient,
      includeSellers: true,
    });

    expect(result.data.sellers).toEqual([{ seller: "raycon", cart: RAYCON_CART }]);
    expect(logger.warn).toHaveBeenCalledWith(
      "seller cart read failed, so the response leaves the seller out",
      { scope: "cart-api", seller: "broken", error },
    );
  });

  it("returns an empty sellers list without seller cookies", async () => {
    const { handlers } = createTransport();

    const result = await handlers.get({
      request: getRequest("https://app.example.com/"),
      storefrontClient,
      includeSellers: true,
    });

    expect(result.data).toEqual({ cart: null, ordering: "sequential", sellers: [] });
  });

  it("leaves sellers out for a transport without seller support", async () => {
    const { transport, handlers } = createTransport({ sellers: false });

    const result = await handlers.get({
      request: getRequest("https://app.example.com/", sellerCookie("raycon", "r")),
      storefrontClient,
      includeSellers: true,
    });

    expect(result.data).toEqual({ cart: null, ordering: "sequential" });
    expect(transport.getCart).not.toHaveBeenCalled();
  });

  it("leaves sellers out for the default Storefront API handlers", async () => {
    const handlers = createCartServerHandlers();

    const result = await handlers.get({
      request: getRequest("https://app.example.com/", sellerCookie("raycon", "r")),
      storefrontClient,
      includeSellers: true,
    });

    expect(result.data).toEqual({ cart: null });
  });
});

describe("seller support", () => {
  it("returns seller_not_supported for a seller POST to the default Storefront API handlers", async () => {
    const handlers = createCartServerHandlers();

    const result = await handlers.post({ request: jsonPost(SELLER_URL, ADD), storefrontClient });

    expect(result).toMatchObject({ type: "error", error: { code: "seller_not_supported" } });
  });

  it("returns seller_not_supported for a transport without seller support", async () => {
    const { transport, handlers } = createTransport({ sellers: false });

    const result = await handlers.post({ request: jsonPost(SELLER_URL, ADD), storefrontClient });

    expect(result).toMatchObject({ type: "error", error: { code: "seller_not_supported" } });
    expect(transport.updateCart).not.toHaveBeenCalled();
  });

  it("ignores ?seller= on GET for the default Storefront API handlers", async () => {
    const handlers = createCartServerHandlers();

    const result = await handlers.get({ request: getRequest(SELLER_URL), storefrontClient });

    expect(result).toEqual(expect.objectContaining({ type: "json", data: { cart: null } }));
  });
});

describe("seller cart POST", () => {
  it("creates the seller cart and sets an HttpOnly seller cookie with Max-Age from expiresAt", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: jsonPost(SELLER_URL, ADD, "cart=home%3Fkey%3Dh"),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(ADD, { storefrontClient, seller: "raycon" });
    expect(jsonData(result)).toEqual({
      cart: RAYCON_CART,
      userErrors: [],
      warnings: [],
      ordering: "sequential",
    });
    expect(setCookies(result)).toEqual([
      `hydrogen-cart.raycon=${NOW_SECONDS}|raycon-token%3Fkey%3Dr; Path=/; SameSite=Lax; HttpOnly; Max-Age=${TEN_DAYS}; Secure`,
    ]);
  });

  it("leaves Secure out on an HTTP request", async () => {
    const { handlers } = createTransport();

    const result = await handlers.post({
      request: jsonPost("http://localhost:3000/api/cart?seller=raycon", ADD),
      storefrontClient,
    });

    const [cookie] = setCookies(result);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("Secure");
  });

  it("changes the cart from the seller cookie and refreshes the cookie", async () => {
    const { transport, handlers } = createTransport({ write: { expiresAt: undefined } });
    const update = { lines: [{ id: "gid://shopify/CartLine/1", quantity: 3 }] };

    const result = await handlers.post({
      request: jsonPost(SELLER_URL, update, sellerCookie("raycon", "raycon-token?key=r")),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(
      { cartId: "gid://shopify/Cart/raycon-token?key=r", ...update },
      { storefrontClient, seller: "raycon" },
    );
    expect(setCookies(result)).toEqual([
      expect.stringMatching(
        new RegExp(
          `^hydrogen-cart\\.raycon=${NOW_SECONDS}\\|raycon-token%3Fkey%3Dr;.*Max-Age=1209600`,
        ),
      ),
    ]);
  });

  it("keeps the cookie of an emptied cart", async () => {
    const { handlers } = createTransport({ write: { cart: cart("raycon-token?key=r", []) } });

    const result = await handlers.post({
      request: jsonPost(
        SELLER_URL,
        { lines: [{ id: "gid://shopify/CartLine/1", quantity: 0 }] },
        sellerCookie("raycon", "raycon-token?key=r"),
      ),
      storefrontClient,
    });

    expect(setCookies(result)).toEqual([
      expect.stringMatching(/^hydrogen-cart\.raycon=\d+\|raycon-token.*Max-Age=864000/),
    ]);
  });

  it("expires the seller cookie only when the cart no longer exists", async () => {
    const { handlers } = createTransport({
      write: { cart: null, userErrors: [{ code: null, message: "The cart doesn't exist." }] },
    });

    const result = await handlers.post({
      request: jsonPost(
        SELLER_URL,
        { lines: [{ id: "gid://shopify/CartLine/1", quantity: 2 }] },
        `cart=home; ${sellerCookie("raycon", "raycon-token?key=r")}`,
      ),
      storefrontClient,
    });

    expect(setCookies(result)).toEqual([
      "hydrogen-cart.raycon=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Secure",
    ]);
  });

  it("sets no cookie when the add returns no cart and there was no cookie", async () => {
    const { handlers } = createTransport({ write: { cart: null } });

    const result = await handlers.post({ request: jsonPost(SELLER_URL, ADD), storefrontClient });

    expect(setCookies(result)).toEqual([]);
  });

  it("leaves cookies alone when the body names another cart", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: jsonPost(
        SELLER_URL,
        { cartId: "gid://shopify/Cart/other", ...ADD },
        sellerCookie("raycon", "raycon-token?key=r"),
      ),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(
      { cartId: "gid://shopify/Cart/other", ...ADD },
      { storefrontClient, seller: "raycon" },
    );
    expect(setCookies(result)).toEqual([]);
  });

  it("expires the least recently written seller cookie when an 11th seller arrives", async () => {
    const { handlers } = createTransport();
    const cookie = [
      "cart=home",
      ...Array.from({ length: 10 }, (_, index) =>
        sellerCookie(`s${index}`, `t${index}`, NOW_SECONDS - 100 + index),
      ),
    ].join("; ");

    const result = await handlers.post({
      request: jsonPost(SELLER_URL, ADD, cookie),
      storefrontClient,
    });

    const cookies = setCookies(result);
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(/^hydrogen-cart\.raycon=/);
    expect(cookies[1]).toBe("hydrogen-cart.s0=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0; Secure");
  });

  it("returns missing_cart for a change without a seller cart", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: jsonPost(SELLER_URL, { lines: [{ id: "gid://shopify/CartLine/1", quantity: 2 }] }),
      storefrontClient,
    });

    expect(result).toMatchObject({ type: "error", error: { code: "missing_cart" } });
    expect(transport.updateCart).not.toHaveBeenCalled();
  });

  it("returns invalid_seller for a JSON post", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: jsonPost("https://app.example.com/api/cart?seller=RAYCON", ADD),
      storefrontClient,
    });

    expect(result).toMatchObject({ type: "error", error: { code: "invalid_seller" } });
    expect(transport.updateCart).not.toHaveBeenCalled();
  });

  it("redirects a form post and sets the seller cookie", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: formPost(SELLER_URL, {
        action: "add",
        merchandiseId: "gid://shopify/ProductVariant/1",
        quantity: "1",
      }),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(
      { lines: [expect.objectContaining({ merchandiseId: "gid://shopify/ProductVariant/1" })] },
      { storefrontClient, seller: "raycon" },
    );
    expect(result).toMatchObject({ type: "redirect", location: "/products/a" });
    expect(setCookies(result)).toEqual([expect.stringMatching(/^hydrogen-cart\.raycon=/)]);
  });

  it("redirects a form post with an invalid seller without changing a cart", async () => {
    const { transport, handlers } = createTransport();

    const result = await handlers.post({
      request: formPost("https://app.example.com/api/cart?seller=bad.handle", {
        action: "add",
        merchandiseId: "gid://shopify/ProductVariant/1",
      }),
      storefrontClient,
    });

    expect(result).toEqual({ type: "redirect", location: "/products/a", headers: {} });
    expect(transport.updateCart).not.toHaveBeenCalled();
  });
});

describe("home cart with seller cookies", () => {
  it("keeps the home flow: no seller context, only the cart cookie", async () => {
    const { transport, handlers } = createTransport({ write: { cart: HOME_CART } });

    const result = await handlers.post({
      request: jsonPost(
        "https://app.example.com/api/cart",
        ADD,
        sellerCookie("raycon", "raycon-token?key=r"),
      ),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(ADD, {
      storefrontClient,
      customerAccessToken: undefined,
    });
    expect(setCookies(result)).toEqual([
      "cart=home%3Fkey%3Dh; Path=/; SameSite=Lax; Max-Age=1209600",
    ]);
  });

  it("reads the home cart on GET without sellers", async () => {
    const { transport, handlers } = createTransport({ reads: { home: read(HOME_CART) } });

    const result = await handlers.get({
      request: getRequest(
        "https://app.example.com/api/cart",
        `cart=home%3Fkey%3Dh; ${sellerCookie("raycon", "raycon-token?key=r")}`,
      ),
      storefrontClient,
    });

    expect(transport.getCart).toHaveBeenCalledTimes(1);
    expect(jsonData(result)).toEqual({ cart: HOME_CART, ordering: "sequential" });
  });
});
