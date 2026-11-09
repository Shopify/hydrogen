import { describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { createCustomerSession } from "../../customer-account/session";
import { gql } from "../../graphql";
import { createCartServerHandlers } from "./server-handlers";
import { EMPTY_CART_DATA } from "./state";
import { createCartServerTransport, getCartTransport, type CartTransport } from "./transport";

const CART_ID = "gid://shopify/Cart/abc?key=1";
const CART = { ...EMPTY_CART_DATA, id: CART_ID };

function createTransport(ordering: CartTransport["ordering"] = "sequential") {
  const transport = {
    ordering,
    sellers: false,
    getCart: vi.fn().mockResolvedValue({ cart: CART, headers: new Headers() }),
    updateCart: vi.fn().mockResolvedValue({
      cart: CART,
      userErrors: [],
      warnings: [],
      headers: new Headers(),
    }),
  } satisfies CartTransport;
  return { transport, serverTransport: createCartServerTransport(transport) };
}

const storefrontClient = {
  storeUrl: "https://shop.example.com",
  requestContext: {},
} as unknown as StorefrontClient;

function jsonPost(body: unknown, cookie?: string): Request {
  return new Request("https://app.example.com/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie && { cookie }) },
    body: JSON.stringify(body),
  });
}

describe("getCartTransport", () => {
  it("returns the transport from a factory-built server transport", () => {
    const { transport, serverTransport } = createTransport();

    expect(getCartTransport(serverTransport)).toBe(transport);
    expect(Object.isFrozen(serverTransport)).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", "ucp"],
    ["an empty object", {}],
    ["an object with a bad transport", { "~cartTransport": { getCart: () => null } }],
  ])("throws a TypeError for %s", (_label, value) => {
    expect(() => getCartTransport(value)).toThrow(TypeError);
  });
});

describe("createCartServerHandlers with transport", () => {
  it("throws a TypeError at creation time for a value not built by a factory", () => {
    expect(() =>
      createCartServerHandlers({ transport: {} as ReturnType<typeof createCartServerTransport> }),
    ).toThrow(TypeError);
  });

  it("throws a TypeError at creation time when combined with fragment or customerSession", () => {
    const { serverTransport } = createTransport();
    const fragment = gql(`fragment CartFragment on Cart { note }`);
    const customerSession = createCustomerSession({
      shopId: "1",
      customerAccountApiClientId: "shp_test",
    });

    // @ts-expect-error transport can't be combined with fragment.
    expect(() => createCartServerHandlers({ transport: serverTransport, fragment })).toThrow(
      TypeError,
    );
    expect(() =>
      // @ts-expect-error transport can't be combined with customerSession.
      createCartServerHandlers({ transport: serverTransport, customerSession }),
    ).toThrow(TypeError);
  });

  it("reads through the transport and adds sequential ordering to GET data", async () => {
    const { transport, serverTransport } = createTransport();
    const handlers = createCartServerHandlers({ transport: serverTransport });
    const request = new Request("https://app.example.com/api/cart", {
      headers: { cookie: "cart=abc%3Fkey%3D1" },
    });

    const result = await handlers.get({ request, storefrontClient });

    expect(transport.getCart).toHaveBeenCalledWith({ cartId: CART_ID }, { storefrontClient });
    expect(result.data).toEqual({ cart: CART, ordering: "sequential" });
  });

  it("adds sequential ordering to GET data without a cart ID", async () => {
    const { transport, serverTransport } = createTransport();
    const handlers = createCartServerHandlers({ transport: serverTransport });

    const result = await handlers.get({
      request: new Request("https://app.example.com/api/cart"),
      storefrontClient,
    });

    expect(transport.getCart).not.toHaveBeenCalled();
    expect(result.data).toEqual({ cart: null, ordering: "sequential" });
  });

  it("applies through the transport and adds sequential ordering to POST JSON", async () => {
    const { transport, serverTransport } = createTransport();
    const handlers = createCartServerHandlers({ transport: serverTransport });
    const result = await handlers.post({
      request: jsonPost({ lines: [{ merchandiseId: "v1", quantity: 1 }] }),
      storefrontClient,
    });

    expect(transport.updateCart).toHaveBeenCalledWith(
      { lines: [{ merchandiseId: "v1", quantity: 1 }] },
      {
        storefrontClient,
        customerAccessToken: undefined,
      },
    );
    if (result.type !== "json") throw new Error("expected json result");
    expect(result.data).toEqual({
      cart: CART,
      userErrors: [],
      warnings: [],
      ordering: "sequential",
    });
    expect(new Headers(result.headers).get("set-cookie")).toContain("cart=abc");
  });

  it("leaves ordering out for a concurrent transport", async () => {
    const { serverTransport } = createTransport("concurrent");
    const handlers = createCartServerHandlers({ transport: serverTransport });

    const get = await handlers.get({
      request: new Request("https://app.example.com/api/cart"),
      storefrontClient,
    });
    const post = await handlers.post({
      request: jsonPost({ lines: [{ merchandiseId: "v1", quantity: 1 }] }),
      storefrontClient,
    });

    expect(get.data).toEqual({ cart: null });
    if (post.type !== "json") throw new Error("expected json result");
    expect(post.data).not.toHaveProperty("ordering");
  });

  it("leaves ordering out for the default Storefront API handlers", async () => {
    const handlers = createCartServerHandlers();

    const result = await handlers.get({
      request: new Request("https://app.example.com/api/cart"),
      storefrontClient,
    });

    expect(result.data).toEqual({ cart: null });
    expect(result.data).not.toHaveProperty("ordering");
  });
});
