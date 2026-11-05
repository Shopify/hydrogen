import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { createRedactor, REDACTED } from "./evidence.ts";

const CART_ID = "gid://shopify/Cart/hWN1abcdEFGH1234?key=0123456789abcdef";
const CHECKOUT_URL = "https://shop.example.com/cart/c/hWN1abcdEFGH1234?key=0123456789abcdef";

describe("createRedactor", () => {
  it("redacts cart IDs, plain and URL-encoded", () => {
    const redactor = createRedactor();
    const text = redactor.text(`cart ${CART_ID} and ${encodeURIComponent(CART_ID)}`);
    assert.doesNotMatch(text, /hWN1abcd|0123456789abcdef/);
  });

  it("redacts checkout path tokens and query secrets but keeps the variant parameter", () => {
    const redactor = createRedactor();
    const text = redactor.text(
      `${CHECKOUT_URL} https://shop.example.com/checkouts/cn/Z2NwLXVzLWNlbnRyYWwx/en-us?_r=secret123 /products/a?variant=42`,
    );
    assert.doesNotMatch(text, /hWN1abcd|0123456789abcdef|Z2NwLXVz|secret123/);
    assert.match(text, /variant=42/);
    assert.match(text, /\/checkouts\/cn\/\[REDACTED\]/);
  });

  it("redacts registered literal secrets inside embedded strings", () => {
    const redactor = createRedactor(["model-key-value-123"]);
    redactor.addSecret("opaque-token-abcdef");
    const text = redactor.text('Agent typed "opaque-token-abcdef" with model-key-value-123');
    assert.equal(text, `Agent typed "${REDACTED}" with ${REDACTED}`);
  });

  it("redacts authorization headers and provider keys in API errors", () => {
    const redactor = createRedactor();
    const text = redactor.text(
      "HTTP 401: Authorization: Bearer abc.def.ghi; x-shopify-storefront-access-token: tok123; key sk-abcdefghijklmnopqrstuv",
    );
    assert.doesNotMatch(text, /abc\.def|tok123|sk-abcdefghij/);
  });

  it("serializes with sensitive keys and nested strings redacted", () => {
    const redactor = createRedactor();
    const json = redactor.serialize({
      kind: "checkout",
      data: {
        url: CHECKOUT_URL,
        cartId: CART_ID,
        apiKey: "x",
        nested: [{ text: `go to ${CART_ID}` }],
      },
      error: new Error(`failed for ${CART_ID}`),
    });
    assert.doesNotMatch(json, /hWN1abcd|0123456789abcdef/);
    assert.match(json, /"cartId":"\[REDACTED\]"/);
    assert.match(json, /"apiKey":"\[REDACTED\]"/);
    assert.match(json, /"message":"failed for gid:\/\/shopify\/Cart\/\[REDACTED\]"/);
  });

  it("redacts cart references of any token format in checkout paths, and keeps route shapes", () => {
    const redactor = createRedactor();
    const text = redactor.text(
      [
        "https://s.example/cart/c/x9",
        "https://s.example/checkouts/cn/Ab~.!*'()9/en-ca/information",
        "https://shop.app/checkout/12345/cn/wrapTok/en-ca",
        "https://s.example/checkouts/co/a%2Bb",
        "/cart/c/:segment /checkouts/cn/:segment/:locale /checkout/:number/cn/:segment",
      ].join(" "),
    );
    assert.doesNotMatch(text, /x9|Ab~|wrapTok|a%2Bb/);
    assert.match(text, /\/checkouts\/cn\/\[REDACTED\]\/en-ca\/information/);
    assert.match(text, /\/checkout\/12345\/cn\/\[REDACTED\]/);
    assert.match(
      text,
      /\/cart\/c\/:segment \/checkouts\/cn\/:segment\/:locale \/checkout\/:number\/cn\/:segment/,
    );
  });

  it("masks the id of any cart object, of any format and length", () => {
    const redactor = createRedactor();
    const json = redactor.serialize({
      data: {
        result: { cart: { id: "c1", totalQuantity: 1 } },
        input: { cart: { id: "opaque-ref~2" } },
        product: { id: "gid://shopify/Product/1" },
      },
    });
    assert.doesNotMatch(json, /"c1"|opaque-ref/);
    assert.match(json, /"cart":\{"id":"\[REDACTED\]","totalQuantity":1\}/);
    assert.match(json, /gid:\/\/shopify\/Product\/1/);
  });
});
