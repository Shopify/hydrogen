import { errors, type APIRequestContext } from "playwright-core";
import { describe, expect, it, vi } from "vitest";

import { CartReadError, parseCartPayload, readCart } from "./cart.ts";

const ORIGIN = "https://shop.example";
const NOT_CONFIGURED =
  " This storefront does not serve a usable cart.js (cart.js is not configured), so the cart was not checked.";
const SHAPE = `the cart JSON response does not have the expected cart shape.${NOT_CONFIGURED}`;

describe("parseCartPayload", () => {
  it("converts number and decimal-string variant IDs to ProductVariant GIDs", () => {
    expect(
      parseCartPayload({
        items: [
          { variant_id: 42, quantity: 1 },
          { variant_id: "12345678901234567890", quantity: 2 },
        ],
      }),
    ).toEqual({
      lines: [
        { variantId: "gid://shopify/ProductVariant/42", quantity: 1 },
        { variantId: "gid://shopify/ProductVariant/12345678901234567890", quantity: 2 },
      ],
    });
  });

  it("accepts an empty cart", () => {
    expect(parseCartPayload({ items: [] })).toEqual({ lines: [] });
  });

  it("accepts 500 items and rejects 501", () => {
    const items = Array.from({ length: 500 }, () => ({ variant_id: 1, quantity: 1 }));

    expect(parseCartPayload({ items }).lines).toHaveLength(500);
    expect(() => parseCartPayload({ items: [...items, { variant_id: 1, quantity: 1 }] })).toThrow(
      new CartReadError(SHAPE),
    );
  });

  it.each([
    ["no items", { items: null }],
    ["a variant ID of 0", { items: [{ variant_id: 0, quantity: 1 }] }],
    ["a negative variant ID", { items: [{ variant_id: -1, quantity: 1 }] }],
    ["a fractional variant ID", { items: [{ variant_id: 1.5, quantity: 1 }] }],
    ["an unsafe variant ID", { items: [{ variant_id: 2 ** 60, quantity: 1 }] }],
    ["a variant ID with a leading zero", { items: [{ variant_id: "01", quantity: 1 }] }],
    ["a GID variant ID", { items: [{ variant_id: "gid://x/1", quantity: 1 }] }],
    ["a null variant ID", { items: [{ variant_id: null, quantity: 1 }] }],
    ["a quantity of 0", { items: [{ variant_id: 1, quantity: 0 }] }],
    ["a string quantity", { items: [{ variant_id: 1, quantity: "1" }] }],
    ["a body that is not an object", "cart"],
  ])("rejects %s", (_case, body) => {
    expect(() => parseCartPayload(body)).toThrow(new CartReadError(SHAPE));
  });
});

describe("readCart", () => {
  /** A fake of the browser context's request API. `answer` gives the status and body text. */
  function fakeRequest(answer: () => Promise<{ status: number; text: string }>) {
    const dispose = vi.fn(async () => undefined);
    const get = vi.fn(async (_url: string, _options: unknown) => {
      const { status, text } = await answer();
      return { status: () => status, text: async () => text, dispose };
    });
    return { request: { get } as unknown as APIRequestContext, get, dispose };
  }

  it("sends one GET to <origin>/cart.js without following redirects, and parses the body", async () => {
    const { request, get, dispose } = fakeRequest(async () => ({
      status: 200,
      text: JSON.stringify({ token: "secret", items: [{ variant_id: 7, quantity: 1 }] }),
    }));

    await expect(readCart(request, ORIGIN)).resolves.toEqual({
      lines: [{ variantId: "gid://shopify/ProductVariant/7", quantity: 1 }],
    });
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("https://shop.example/cart.js", {
      headers: { accept: "application/json" },
      maxRedirects: 0,
      failOnStatusCode: false,
      timeout: 5_000,
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it.each([
    [302, "", `the cart JSON endpoint redirected; the redirect was not followed.${NOT_CONFIGURED}`],
    [404, "<html>Not found</html>", `the cart JSON endpoint answered HTTP 404.${NOT_CONFIGURED}`],
    [500, "secret stack", `the cart JSON endpoint answered HTTP 500.${NOT_CONFIGURED}`],
    [200, "<html>secret</html>", `the cart JSON response is not JSON.${NOT_CONFIGURED}`],
    [200, JSON.stringify({ items: "secret" }), SHAPE],
  ])("gives a fixed message for HTTP %i with the body %j", async (status, text, message) => {
    const { request } = fakeRequest(async () => ({ status, text }));

    await expectError(readCart(request, ORIGIN), message);
  });

  it("gives the request-failed message when the request throws", async () => {
    const { request } = fakeRequest(async () => {
      throw new Error("apiRequestContext.get: connect ECONNREFUSED 127.0.0.1:1\nCall log: secret");
    });

    await expectError(readCart(request, ORIGIN), "the cart JSON request failed.");
  });

  it("gives the timeout message when the request times out", async () => {
    const { request } = fakeRequest(async () => {
      throw new errors.TimeoutError("apiRequestContext.get: Timeout 5000ms exceeded.");
    });

    await expectError(readCart(request, ORIGIN), "the cart JSON did not arrive within 5000 ms.");
  });
});

/** Checks the error class, not only the message. */
async function expectError(promise: Promise<unknown>, message: string): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(CartReadError);
  expect(error).toHaveProperty("message", message);
}
