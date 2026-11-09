import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../client";
import type { CartAction } from "../core/cart/actions";
import { runCartAction } from "../core/cart/run-cart-action";
import { getCartTransport } from "../core/cart/transport";
import { configureLogging } from "../core/logging";
import { assert, createTestLogger } from "../core/test-utils";
import { UcpToolError } from "./mcp";
import fixtures from "./test-fixtures.json" with { type: "json" };
import { createUcpCartTransport } from "./transport";

const PROFILE = "https://example.com/agent-profile.json";
const CART_ID = fixtures.getCart.result.structuredContent.id;
const VARIANT_1 = "gid://shopify/ProductVariant/51604076232760";
const VARIANT_2 = "gid://shopify/ProductVariant/51604076265528";
const VARIANT_3 = "gid://shopify/ProductVariant/51604076298296";
const LINE_1 =
  "gid://shopify/CartLine/0676ac35-238a-4032-9ce4-9687f0b142c2?cart=fixture-cart-token";
const LINE_2 =
  "gid://shopify/CartLine/b9a8b418-bda5-4591-8bb5-5df64a68c6f0?cart=fixture-cart-token";
const CONTEXT = { address_country: "CA", language: "EN" };
const CURRENT_LINES = [
  { id: LINE_2, item: { id: VARIANT_2 }, quantity: 2 },
  { id: LINE_1, item: { id: VARIANT_1 }, quantity: 1 },
];
const CURRENT_CODES = ["NOTACODE", "free-ship"];

type Route = (args: Record<string, unknown>) => unknown;

let fetchMock: ReturnType<typeof vi.fn>;
let requestController: AbortController;

function stubUcp(routes: Record<string, Route | unknown>) {
  fetchMock.mockImplementation(async (_url: URL, init: RequestInit) => {
    const { params } = JSON.parse(String(init.body));
    const route = routes[params.name];
    const body = typeof route === "function" ? route(params.arguments) : route;
    if (body === undefined) throw new Error(`Unexpected UCP tool ${params.name}`);
    return body instanceof Response ? body : Response.json(body);
  });
}

function toolCalls(): Array<{ name: string; args: Record<string, unknown> }> {
  return fetchMock.mock.calls.map(([, init]) => {
    const { params } = JSON.parse(String(init.body));
    const { meta: _meta, ...args } = params.arguments;
    return { name: params.name, args };
  });
}

function updateArgs(): Record<string, unknown> | undefined {
  return toolCalls().find(({ name }) => name === "update_cart")?.args;
}

function getCartError(message: { code: string; content: string; severity: string }) {
  const response = structuredClone(fixtures.getCartNotFound);
  response.result.structuredContent.messages = [
    { type: "error", content_type: "plain", ...message },
  ];
  return response;
}

function createTransport() {
  return getCartTransport(createUcpCartTransport({ agentProfile: PROFILE }));
}

function createContext() {
  const storefrontClient = {
    storeUrl: "https://shop.example.com",
    i18n: { country: "CA", language: "EN" },
    requestContext: { signal: requestController.signal },
  } as unknown as StorefrontClient;
  return { storefrontClient };
}

const defaultRoutes = {
  get_cart: fixtures.getCart,
  update_cart: fixtures.getCart,
  create_cart: fixtures.createCart,
  lookup_catalog: fixtures.lookupCatalog,
};

beforeEach(() => {
  fetchMock = vi.fn();
  requestController = new AbortController();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  configureLogging({});
});

describe("createUcpCartTransport", () => {
  it("creates a sequential transport that supports sellers", () => {
    const transport = createTransport();

    expect(transport.ordering).toBe("sequential");
    expect(transport.sellers).toBe(true);
  });

  it("throws in a browser", () => {
    vi.stubGlobal("document", {});

    expect(() => createUcpCartTransport({ agentProfile: PROFILE })).toThrow(/browser/);
  });

  it("throws a TypeError for an invalid agent profile URL", () => {
    expect(() => createUcpCartTransport({ agentProfile: "not a url" })).toThrow(TypeError);
  });
});

describe("UCP requests", () => {
  it("posts a JSON-RPC tool call to the store's UCP endpoint without cookies", async () => {
    stubUcp(defaultRoutes);

    await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toBe("https://shop.example.com/api/ucp/mcp");
      expect(init.method).toBe("POST");
      expect(init.cache).toBe("no-store");
      const headers = new Headers(init.headers);
      expect(headers.get("content-type")).toBe("application/json");
      expect(headers.get("accept")).toBe("application/json");
      expect(headers.get("user-agent")).toMatch(/^Hydrogen /);
      expect(headers.has("cookie")).toBe(false);
    }
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init.body))).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_cart",
        arguments: { id: CART_ID, meta: { "ucp-agent": { profile: PROFILE } } },
      },
    });
  });

  it("sends a seller's requests to the seller's myshopify.com UCP endpoint", async () => {
    stubUcp(defaultRoutes);

    await createTransport().getCart({ cartId: CART_ID }, { ...createContext(), seller: "raycon" });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://raycon.myshopify.com/api/ucp/mcp",
      "https://raycon.myshopify.com/api/ucp/mcp",
    ]);
  });

  it.each(["evil.com/x#", "a@b", "Raycon", "a.b"])(
    "rejects a seller %j whose endpoint isn't <seller>.myshopify.com",
    async (seller) => {
      stubUcp(defaultRoutes);

      await expect(
        createTransport().getCart({ cartId: CART_ID }, { ...createContext(), seller }),
      ).rejects.toThrow(TypeError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("sends a new idempotency key with each cart write and none with reads", async () => {
    stubUcp(defaultRoutes);
    const transport = createTransport();
    const add: CartAction = { intent: "add", lines: [{ merchandiseId: VARIANT_3, quantity: 1 }] };

    await runCartAction(transport, null, add, createContext());
    await runCartAction(transport, CART_ID, add, createContext());

    const metas = fetchMock.mock.calls.map(([, init]) => {
      const { params } = JSON.parse(String(init.body));
      return { name: params.name, key: params.arguments.meta["idempotency-key"] };
    });
    const writeKeys = metas.filter(({ name }) => name.endsWith("_cart") && name !== "get_cart");
    expect(writeKeys.map(({ name }) => name)).toEqual(["create_cart", "update_cart"]);
    for (const { key } of writeKeys) expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Set(writeKeys.map(({ key }) => key)).size).toBe(2);
    expect(metas.filter(({ key }) => key === undefined).map(({ name }) => name)).toEqual(
      expect.arrayContaining(["get_cart", "lookup_catalog"]),
    );
  });

  it("aborts the request when the incoming request aborts", async () => {
    stubUcp(defaultRoutes);

    await createTransport().getCart({ cartId: CART_ID }, createContext());
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const signal: AbortSignal = init.signal;

    expect(signal.aborted).toBe(false);
    requestController.abort();
    expect(signal.aborted).toBe(true);
  });

  it("throws on a non-2xx response", async () => {
    stubUcp({ get_cart: () => new Response("nope", { status: 502, statusText: "Bad Gateway" }) });

    await expect(createTransport().getCart({ cartId: CART_ID }, createContext())).rejects.toThrow(
      "UCP get_cart failed with status 502: Bad Gateway",
    );
  });

  it("throws on a JSON-RPC error", async () => {
    stubUcp({ get_cart: fixtures.lookupCatalogMinimalProfile });

    await expect(createTransport().getCart({ cartId: CART_ID }, createContext())).rejects.toThrow(
      "UCP get_cart failed with status 200: Invalid params: Tool not found: lookup_catalog",
    );
  });

  it("includes the JSON-RPC error's code and content in the message", async () => {
    stubUcp({
      get_cart: {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32001,
          message: "UCP discovery failed",
          data: {
            code: "profile_unreachable",
            content: "Unable to fetch agent profile: Http error",
          },
        },
      },
    });

    await expect(createTransport().getCart({ cartId: CART_ID }, createContext())).rejects.toThrow(
      "UCP get_cart failed with status 200: UCP discovery failed (profile_unreachable: Unable to fetch agent profile: Http error)",
    );
  });

  it("throws on a recoverable get_cart error", async () => {
    stubUcp({
      get_cart: getCartError({ code: "busy", content: "Try again", severity: "recoverable" }),
    });

    await expect(createTransport().getCart({ cartId: CART_ID }, createContext())).rejects.toThrow(
      "UCP get_cart failed with status 200: Try again",
    );
  });

  it("throws on a tool error other than a missing cart on read", async () => {
    const toolError = structuredClone(fixtures.getCartNotFound);
    toolError.result.structuredContent.messages = [
      { ...toolError.result.structuredContent.messages[0], code: "internal", content: "Boom" },
    ] as typeof toolError.result.structuredContent.messages;
    stubUcp({ ...defaultRoutes, update_cart: toolError });

    await expect(
      runCartAction(
        createTransport(),
        CART_ID,
        { intent: "remove", lineIds: [LINE_1] },
        createContext(),
      ),
    ).rejects.toThrow("UCP update_cart failed with status 200: Boom");
  });
});

describe("read", () => {
  it("reads the cart and looks up product details", async () => {
    stubUcp(defaultRoutes);

    const result = await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(toolCalls()).toEqual([
      { name: "get_cart", args: { id: CART_ID } },
      { name: "lookup_catalog", args: { catalog: { ids: [VARIANT_2, VARIANT_1] } } },
    ]);
    expect(result.cart?.lines.nodes[1]?.merchandise?.product).toMatchObject({
      handle: "home-decor-example-product-1",
    });
    expect(result.headers).toBeInstanceOf(Headers);
  });

  it("returns a null cart when the cart doesn't exist", async () => {
    stubUcp({ get_cart: fixtures.getCartNotFound });

    const result = await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(result.cart).toBeNull();
    expect(toolCalls().map(({ name }) => name)).toEqual(["get_cart"]);
  });

  it.each([
    ["not_found", "The cart does not exist, has expired, or was canceled."],
    ["invalid_cart_id", "Invalid id format. Expected a Shopify Cart GID."],
  ])("returns a null cart for an unrecoverable %s error", async (code, content) => {
    stubUcp({ get_cart: getCartError({ code, content, severity: "unrecoverable" }) });

    const result = await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(result.cart).toBeNull();
  });

  it("skips the lookup when catalog lookup isn't negotiated", async () => {
    stubUcp({ get_cart: fixtures.updateCartMinimalProfileDiscount });

    const result = await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(toolCalls().map(({ name }) => name)).toEqual(["get_cart"]);
    expect(result.cart?.lines.nodes[0]?.merchandise?.product.title).toBe("Example product");
  });

  it("falls back to line item titles and warns when the lookup fails", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    stubUcp({ ...defaultRoutes, lookup_catalog: fixtures.lookupCatalogMinimalProfile });

    const result = await createTransport().getCart({ cartId: CART_ID }, createContext());

    expect(result.cart?.lines.nodes[1]?.merchandise?.product).toEqual({ title: "Default Title" });
    expect(logger.warn).toHaveBeenCalledWith(
      "product lookup failed, so cart lines show their variant titles",
      { scope: "ucp-cart", error: expect.any(UcpToolError) },
    );
  });

  it.each<[string, (cart: any) => void]>([
    ["a line without a title", (cart) => delete cart.line_items[0].item.title],
    ["a total without a numeric amount", (cart) => (cart.totals[0].amount = "144.00")],
    ["a discount code that isn't a string", (cart) => (cart.discounts = { codes: [42] })],
  ])("throws instead of mapping %s", async (_, corrupt) => {
    const response = structuredClone(fixtures.getCart);
    corrupt(response.result.structuredContent);
    stubUcp({ ...defaultRoutes, get_cart: response });

    await expect(createTransport().getCart({ cartId: CART_ID }, createContext())).rejects.toThrow(
      "UCP get_cart failed with status 200: Unexpected structuredContent",
    );
  });
});

describe("apply", () => {
  it("creates a cart for an add without a cart ID, merging lines by variant", async () => {
    stubUcp(defaultRoutes);
    const action: CartAction = {
      intent: "add",
      lines: [
        { merchandiseId: VARIANT_2, quantity: 1 },
        { merchandiseId: VARIANT_1, quantity: 1 },
        { merchandiseId: VARIANT_2, quantity: 1 },
      ],
    };

    const result = await runCartAction(createTransport(), null, action, createContext());

    expect(toolCalls()).toEqual([
      {
        name: "create_cart",
        args: {
          cart: {
            line_items: [
              { item: { id: VARIANT_2 }, quantity: 2 },
              { item: { id: VARIANT_1 }, quantity: 1 },
            ],
            context: CONTEXT,
          },
        },
      },
      { name: "lookup_catalog", args: { catalog: { ids: [VARIANT_2, VARIANT_1] } } },
    ]);
    expect(result.cart?.id).toBe(CART_ID);
    expect(result.userErrors).toEqual([]);
  });

  it("adds to an existing cart, keeping line IDs, context, and discount codes", async () => {
    stubUcp(defaultRoutes);

    await runCartAction(
      createTransport(),
      CART_ID,
      {
        intent: "add",
        lines: [
          { merchandiseId: VARIANT_1, quantity: 2 },
          { merchandiseId: VARIANT_3, quantity: 1 },
        ],
      },
      createContext(),
    );

    expect(toolCalls().map(({ name }) => name)).toEqual([
      "get_cart",
      "update_cart",
      "lookup_catalog",
    ]);
    expect(updateArgs()).toEqual({
      id: CART_ID,
      cart: {
        line_items: [
          { id: LINE_2, item: { id: VARIANT_2 }, quantity: 2 },
          { id: LINE_1, item: { id: VARIANT_1 }, quantity: 3 },
          { item: { id: VARIANT_3 }, quantity: 1 },
        ],
        context: CONTEXT,
        discounts: { codes: CURRENT_CODES },
      },
    });
    expect(toolCalls()[2]?.args).toEqual({
      catalog: { ids: [VARIANT_2, VARIANT_1, VARIANT_3] },
    });
  });

  it("creates a cart for an add when the cart doesn't exist", async () => {
    stubUcp({ ...defaultRoutes, get_cart: fixtures.getCartNotFound });

    const result = await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "add", lines: [{ merchandiseId: VARIANT_1, quantity: 1 }] },
      createContext(),
    );

    expect(toolCalls().map(({ name }) => name)).toEqual([
      "get_cart",
      "create_cart",
      "lookup_catalog",
    ]);
    expect(result.cart?.id).toBe(CART_ID);
  });

  it("returns user errors and warnings from the update", async () => {
    stubUcp({ ...defaultRoutes, update_cart: fixtures.updateCartBadVariant });

    const result = await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "add", lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
      createContext(),
    );

    expect(result.userErrors).toEqual([
      {
        code: "INVALID",
        message: "The merchandise with id gid://shopify/ProductVariant/1 does not exist.",
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("updates quantities by line ID and drops lines set to zero", async () => {
    stubUcp(defaultRoutes);

    await runCartAction(
      createTransport(),
      CART_ID,
      {
        intent: "update",
        lines: [
          { id: LINE_1, quantity: 4 },
          { id: LINE_2, quantity: 0 },
        ],
      },
      createContext(),
    );

    expect(updateArgs()).toEqual({
      id: CART_ID,
      cart: {
        line_items: [{ id: LINE_1, item: { id: VARIANT_1 }, quantity: 4 }],
        context: CONTEXT,
        discounts: { codes: CURRENT_CODES },
      },
    });
  });

  it("resolves an optimistic line ID to the line with the same variant", async () => {
    stubUcp(defaultRoutes);

    await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "update", lines: [{ id: `optimistic:${VARIANT_1}`, quantity: 5 }] },
      createContext(),
    );

    expect(updateArgs()?.cart).toMatchObject({
      line_items: [CURRENT_LINES[0], { id: LINE_1, item: { id: VARIANT_1 }, quantity: 5 }],
    });
  });

  it("matches a line ID that has the Standard Actions ?cart= suffix when the store's IDs don't", async () => {
    const cart = structuredClone(fixtures.getCart);
    for (const line of cart.result.structuredContent.line_items) {
      line.id = line.id.replace(/\?cart=.*$/, "");
    }
    stubUcp({ ...defaultRoutes, get_cart: cart, update_cart: cart });

    const result = await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "update", lines: [{ id: LINE_1, quantity: 5 }] },
      createContext(),
    );

    expect(result.userErrors).toEqual([]);
    expect(updateArgs()?.cart).toMatchObject({
      line_items: [
        { id: LINE_2.split("?cart=")[0], item: { id: VARIANT_2 }, quantity: 2 },
        { id: LINE_1.split("?cart=")[0], item: { id: VARIANT_1 }, quantity: 5 },
      ],
    });
  });

  it.each<[string, CartAction]>([
    [
      "update",
      { intent: "update", lines: [{ id: "gid://shopify/CartLine/missing", quantity: 1 }] },
    ],
    ["remove", { intent: "remove", lineIds: ["gid://shopify/CartLine/missing"] }],
    [
      "update with an optimistic ID for another variant",
      { intent: "update", lines: [{ id: `optimistic:${VARIANT_3}`, quantity: 1 }] },
    ],
  ])("returns a user error without updating for an unknown line ID in %s", async (_, action) => {
    stubUcp(defaultRoutes);

    const result = await runCartAction(createTransport(), CART_ID, action, createContext());

    expect(toolCalls().map(({ name }) => name)).toEqual(["get_cart", "lookup_catalog"]);
    expect(result.userErrors).toEqual([
      { code: "INVALID_MERCHANDISE_LINE", message: expect.stringContaining("no line with ID") },
    ]);
    expect(result.cart?.totalQuantity).toBe(3);
  });

  it("removes lines by ID", async () => {
    stubUcp(defaultRoutes);

    await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "remove", lineIds: [LINE_2] },
      createContext(),
    );

    expect(updateArgs()).toEqual({
      id: CART_ID,
      cart: {
        line_items: [CURRENT_LINES[1]],
        context: CONTEXT,
        discounts: { codes: CURRENT_CODES },
      },
    });
  });

  it("returns a null cart with a user error when a non-add change targets a missing cart", async () => {
    stubUcp({ get_cart: fixtures.getCartNotFound });

    const result = await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "remove", lineIds: [LINE_1] },
      createContext(),
    );

    expect(result.cart).toBeNull();
    expect(result.userErrors).toEqual([{ code: null, message: "The cart doesn't exist." }]);
  });

  it.each<[string, CartAction, string[]]>([
    ["discount-update", { intent: "discount-update", discountCodes: ["a", "b"] }, ["a", "b"]],
    ["discount-apply", { intent: "discount-apply", code: "new" }, [...CURRENT_CODES, "new"]],
    [
      "discount-apply with a present code (UCP drops the duplicate)",
      { intent: "discount-apply", code: "free-ship" },
      [...CURRENT_CODES, "free-ship"],
    ],
    ["discount-remove", { intent: "discount-remove", code: "NOTACODE" }, ["free-ship"]],
  ])("sends the discount codes for %s with every current line", async (_, action, codes) => {
    stubUcp({ ...defaultRoutes, update_cart: fixtures.updateCartDiscount });

    const result = await runCartAction(createTransport(), CART_ID, action, createContext());

    expect(updateArgs()).toEqual({
      id: CART_ID,
      cart: { line_items: CURRENT_LINES, context: CONTEXT, discounts: { codes } },
    });
    expect(result.cart?.discountCodes).toEqual([
      { code: "NOTACODE", applicable: false },
      { code: "free-ship", applicable: true },
    ]);
    expect(result.warnings).toEqual([
      { code: "DISCOUNT_NOT_FOUND", message: "Enter a valid discount code" },
    ]);
  });

  it("returns a user error for a discount change when discounts aren't negotiated", async () => {
    stubUcp({ get_cart: fixtures.updateCartMinimalProfileDiscount });

    const result = await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "discount-apply", code: "free-ship" },
      createContext(),
    );

    expect(toolCalls().map(({ name }) => name)).toEqual(["get_cart", "get_cart"]);
    expect(result.userErrors).toEqual([
      { code: null, message: expect.stringContaining("dev.ucp.shopping.discount") },
    ]);
    expect(result.cart?.id).toBe(CART_ID);
  });

  it("sends line changes and discount codes from one payload in one update", async () => {
    stubUcp(defaultRoutes);

    await createTransport().updateCart(
      {
        cartId: CART_ID,
        lines: [
          { id: LINE_1, quantity: 0 },
          { merchandiseId: VARIANT_3, quantity: 1 },
        ],
        discountCodes: ["free-ship"],
      },
      createContext(),
    );

    expect(toolCalls().filter(({ name }) => name === "update_cart")).toHaveLength(1);
    expect(updateArgs()?.cart).toEqual({
      line_items: [CURRENT_LINES[0], { item: { id: VARIANT_3 }, quantity: 1 }],
      context: CONTEXT,
      discounts: { codes: ["free-ship"] },
    });
  });

  it("returns a user error without creating a cart for an existing-line change and no cart ID", async () => {
    stubUcp(defaultRoutes);

    const result = await createTransport().updateCart(
      { lines: [{ id: LINE_1, quantity: 2 }] },
      createContext(),
    );

    expect(toolCalls()).toEqual([]);
    expect(result.cart).toBeNull();
    expect(result.userErrors).toEqual([
      expect.objectContaining({ code: "INVALID_MERCHANDISE_LINE" }),
    ]);
  });

  it("leaves discounts out of line updates when discounts aren't negotiated", async () => {
    stubUcp({
      get_cart: fixtures.updateCartMinimalProfileDiscount,
      update_cart: fixtures.updateCartMinimalProfileDiscount,
    });

    await runCartAction(
      createTransport(),
      CART_ID,
      { intent: "remove", lineIds: [LINE_1] },
      createContext(),
    );

    expect(updateArgs()?.cart).not.toHaveProperty("discounts");
  });

  it.each<[string, CartAction]>([
    ["note-update", { intent: "note-update", note: "Hi" }],
    ["attributes-update", { intent: "attributes-update", attributes: [{ key: "a", value: "b" }] }],
    [
      "add with line attributes",
      {
        intent: "add",
        lines: [{ merchandiseId: VARIANT_1, quantity: 1, attributes: [{ key: "a", value: "b" }] }],
      },
    ],
    [
      "add with a selling plan",
      { intent: "add", lines: [{ merchandiseId: VARIANT_1, quantity: 1, sellingPlanId: "sp" }] },
    ],
    [
      "update with a variant swap",
      { intent: "update", lines: [{ id: LINE_1, merchandiseId: VARIANT_3, quantity: 1 }] },
    ],
  ])("returns the current cart with a user error for %s", async (_, action) => {
    stubUcp(defaultRoutes);

    const result = await runCartAction(createTransport(), CART_ID, action, createContext());

    expect(toolCalls().map(({ name }) => name)).toEqual(["get_cart", "lookup_catalog"]);
    expect(result.userErrors).toEqual([
      { code: null, message: expect.stringContaining("UCP carts don't support") },
    ]);
    assert(result.cart, "expected the current cart");
    expect(result.cart.id).toBe(CART_ID);
    expect(result.warnings).toEqual([]);
  });

  it("returns a null cart with a user error for an unsupported add without a cart", async () => {
    stubUcp(defaultRoutes);

    const result = await runCartAction(
      createTransport(),
      null,
      { intent: "add", lines: [{ merchandiseId: VARIANT_1, quantity: 1, sellingPlanId: "sp" }] },
      createContext(),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.cart).toBeNull();
    expect(result.userErrors).toHaveLength(1);
  });
});
