import { describe, expect, it, vi } from "vitest";

import { cartMetafieldHandlers } from "../../../../../examples/hydrogen/app/lib/cart-metafields.server";

// Exercise the example's own CSRF protection and cart mutation behavior.
type CartMetafieldHandlerContext = Parameters<typeof cartMetafieldHandlers.post>[0];

const ORIGIN = "https://shop.example.com";
const CART_ID = "gid://shopify/Cart/123";
const METAFIELD = {
  key: "custom.delivery_instructions",
  type: "single_line_text_field",
  value: "Leave at the door",
};

function createContext(request: Request) {
  const graphql = vi.fn().mockResolvedValue({
    data: {
      cartMetafieldsSet: { userErrors: [] },
      cartMetafieldDelete: { userErrors: [] },
    },
  });
  const context: CartMetafieldHandlerContext = {
    request,
    storefrontClient: { graphql } as unknown as CartMetafieldHandlerContext["storefrontClient"],
    requestContext: {} as CartMetafieldHandlerContext["requestContext"],
    sessionManager: {
      getSessionOrigin: async () => ORIGIN,
      getSessionItem: vi.fn(),
      setSessionItem: vi.fn(),
      removeSessionItem: vi.fn(),
    },
  };
  return { context, graphql };
}

function mutationBody(intent: "set" | "delete") {
  return intent === "set" ? { metafields: [METAFIELD] } : { deleteMetafield: METAFIELD.key };
}

describe("custom cart-metafield route origin checks", () => {
  it.each(["set", "delete"] as const)(
    "rejects a sibling-domain text/plain form that would %s metafields",
    async (intent) => {
      // text/plain forms serialize name=value pairs. An ignored field can absorb
      // the equals sign so the body is still valid JSON without a CORS preflight.
      const body = `${JSON.stringify(mutationBody(intent)).slice(0, -1)},"padding":"="}\r\n`;
      expect(JSON.parse(body)).toMatchObject(mutationBody(intent));
      const request = new Request(`${ORIGIN}/api/cart/metafields`, {
        method: "POST",
        headers: {
          origin: "https://evil.example.com",
          "sec-fetch-site": "same-site",
          "content-type": "text/plain",
          cookie: "cart=123",
        },
        body,
      });
      const { context, graphql } = createContext(request);

      const result = await cartMetafieldHandlers.post(context);

      expect(result).toMatchObject({ type: "error", status: 403, error: { code: "forbidden" } });
      expect(new Headers(result.headers).get("cache-control")).toBe("no-store");
      expect(request.bodyUsed).toBe(false);
      expect(graphql).not.toHaveBeenCalled();
    },
  );

  it.each<HeadersInit>([
    { origin: "https://evil.example" },
    { origin: "", referer: `${ORIGIN}/cart` },
    { origin: "null", referer: `${ORIGIN}/cart` },
    { origin: "invalid", referer: `${ORIGIN}/cart` },
    { referer: "https://evil.example.com/cart" },
    {},
  ])(
    "rejects untrusted JSON mutations before body and cookie parsing: %j",
    async (sourceHeaders) => {
      const headers = new Headers(sourceHeaders);
      headers.set("content-type", "application/json");
      headers.set("cookie", "cart=%"); // Would throw if cookie decoding were reached.
      const request = new Request(`${ORIGIN}/api/cart/metafields`, {
        method: "POST",
        headers,
        body: "invalid JSON",
      });
      const { context, graphql } = createContext(request);

      const result = await cartMetafieldHandlers.post(context);

      expect(result).toMatchObject({ type: "error", status: 403, error: { code: "forbidden" } });
      expect(request.bodyUsed).toBe(false);
      expect(graphql).not.toHaveBeenCalled();
    },
  );

  it.each(["set", "delete"] as const)(
    "allows a same-origin %s behind a proxy using the cookie cart owner",
    async (intent) => {
      const request = new Request("http://internal/api/cart/metafields", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json", cookie: "cart=123" },
        body: JSON.stringify({ ...mutationBody(intent), ownerId: "attacker-cart" }),
      });
      const { context, graphql } = createContext(request);

      const result = await cartMetafieldHandlers.post(context);

      expect(result).toEqual({ type: "json", data: { userErrors: [] } });
      expect(graphql).toHaveBeenCalledExactlyOnceWith(expect.any(String), {
        variables:
          intent === "set"
            ? { metafields: [{ ...METAFIELD, ownerId: CART_ID }] }
            : { input: { ownerId: CART_ID, key: METAFIELD.key } },
      });
    },
  );

  it("allows a same-origin Referer when Origin is absent", async () => {
    const request = new Request(`${ORIGIN}/api/cart/metafields`, {
      method: "POST",
      headers: {
        referer: `${ORIGIN}/cart`,
        "content-type": "application/json",
        cookie: "cart=123",
      },
      body: JSON.stringify(mutationBody("delete")),
    });
    const { context, graphql } = createContext(request);

    expect(await cartMetafieldHandlers.post(context)).toEqual({
      type: "json",
      data: { userErrors: [] },
    });
    expect(graphql).toHaveBeenCalledOnce();
  });

  it("does not trust the internal request origin or forwarded host over the public origin", async () => {
    const request = new Request("http://internal/api/cart/metafields", {
      method: "POST",
      headers: { origin: "http://internal", "x-forwarded-host": "internal", cookie: "cart=123" },
      body: JSON.stringify(mutationBody("delete")),
    });
    const { context, graphql } = createContext(request);

    expect(await cartMetafieldHandlers.post(context)).toMatchObject({ type: "error", status: 403 });
    expect(graphql).not.toHaveBeenCalled();
  });
});
