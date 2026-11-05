import { describe, expect, it } from "vitest";

import { classifyDocumentRequest, describeCheckoutRoute } from "./navigation-policy.ts";

const BASE = "https://shop.example.com/";

/** A checkout block that keeps the URL but has no readable cart reference. */
function unreadable(url: string) {
  return {
    action: "block",
    reason: "checkout",
    route: expect.objectContaining({ cart: expect.objectContaining({ readable: false }) }),
    checkout: { url: new URL(url).href },
  };
}

describe("classifyDocumentRequest", () => {
  it("allows storefront and CDN documents", () => {
    for (const url of [
      BASE,
      "https://shop.example.com/products/shirt",
      "https://shop.example.com/cart",
      "https://shop.example.com/collections/checkout-essentials",
      "https://cdn.shopify.com/s/files/page.html",
    ]) {
      expect(classifyDocumentRequest(url, BASE)).toEqual({ action: "continue" });
    }
  });

  it("allows only the exact same-origin storefront /checkout route", () => {
    for (const url of [
      "https://shop.example.com/checkout",
      "https://shop.example.com/checkout/",
      "https://shop.example.com/checkout?step=1",
      "https://shop.example.com/fr-ca/checkout",
    ]) {
      expect(classifyDocumentRequest(url, BASE)).toEqual({ action: "continue" });
    }
    for (const url of [
      "https://shop.example.com/checkout/extra",
      "http://shop.example.com/checkout",
      "https://other.example.com/checkout",
      "https://shop.myshopify.com/checkout",
    ]) {
      expect(classifyDocumentRequest(url, BASE)).toEqual(unreadable(url));
    }
  });

  it("blocks cart permalinks on any safe host and returns them as unverified candidates", () => {
    for (const url of [
      "https://shop.example.com/cart/c/abc123?key=k1",
      "https://shop.myshopify.com/cart/c/abc123?key=k1",
      "https://checkout.example.com/cart/c/abc123?key=k1",
      "https://evil.example.net/cart/c/abc123?key=k1",
      "http://localhost:4000/cart/c/abc123?key=k1",
      "https://checkout.example.com/cart/c/abc123?key=k1&_gl=1*x*_ga",
    ]) {
      expect(classifyDocumentRequest(url, BASE)).toEqual({
        action: "block",
        reason: "checkout",
        route: expect.objectContaining({
          route: "/cart/c/:segment",
          queryNames: expect.arrayContaining(["key"]),
          cart: { readable: true, form: "cart-permalink" },
        }),
        checkout: { url, cartId: "gid://shopify/Cart/abc123?key=k1" },
      });
    }
  });

  it("blocks native and Shop wrapper checkout routes and returns a keyless cart ID", () => {
    const cases: Array<[string, string, string]> = [
      [
        "https://shopca.ladygaga.com/checkouts/cn/fixture-native/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true",
        "/checkouts/cn/:segment/:locale/information",
        "native-checkout",
      ],
      [
        "https://www.ohpolly.com/checkouts/cn/fixture-native/en-ca",
        "/checkouts/cn/:segment/:locale",
        "native-checkout",
      ],
      [
        "https://happydad.ca/checkouts/cn/fixture-native/en-ca",
        "/checkouts/cn/:segment/:locale",
        "native-checkout",
      ],
      [
        "https://shop.app/checkout/12345/cn/fixture-native/en-ca",
        "/checkout/:number/cn/:segment/:locale",
        "shop-checkout",
      ],
    ];
    for (const [url, route, form] of cases) {
      expect(classifyDocumentRequest(url, BASE), url).toEqual({
        action: "block",
        reason: "checkout",
        route: expect.objectContaining({ route, cart: { readable: true, form } }),
        checkout: { url, cartId: "gid://shopify/Cart/fixture-native" },
      });
    }
    const native = classifyDocumentRequest(cases[0]?.[0] ?? "", BASE);
    expect(native).toMatchObject({
      route: { queryNames: ["_r", "auto_redirect", "skip_shop_pay"] },
    });
  });

  it("reads an opaque key with an encoded ampersand or base64 characters as one key", () => {
    for (const [query, idQuery] of [
      ["key=bad%26key", "key=bad%26key"],
      ["key=ab%2Bcd%2F%3D%3D&_gl=x", "key=ab%2Bcd%2F%3D%3D"],
      ["key=abcd==", "key=abcd%3D%3D"],
    ]) {
      const url = `https://checkout.example.com/cart/c/abc123?${query}`;
      expect(classifyDocumentRequest(url, BASE)).toMatchObject({
        reason: "checkout",
        route: { cart: { readable: true } },
        checkout: { url, cartId: `gid://shopify/Cart/abc123?${idQuery}` },
      });
    }
  });

  it("still blocks and keeps the URL when no cart reference is readable", () => {
    for (const url of [
      "http://evil.example.net/cart/c/abc123?key=k1",
      "https://user:pw@evil.example.net/cart/c/abc123?key=k1",
      "https://evil.example.net/cart/c/abc123?key=a&key=b",
      "https://evil.example.net/cart/c/abc123?key=bad%zzkey",
      "https://shop.example.com/fr-ca/checkouts/abc",
      "https://shop.example.com/checkouts/xyz/abc",
      "https://shop.example.com/cart/123:1",
      "https://pay.shopify.com/anything",
    ]) {
      expect(classifyDocumentRequest(url, BASE), url).toEqual(unreadable(url));
    }
  });

  it("blocks customer account pages", () => {
    for (const url of [
      "https://shop.example.com/account",
      "https://shop.example.com/account/login",
      "https://shopify.com/12345/account",
      "https://shopify.com/authentication/12345/login",
      "https://account.shop.example.com/",
      "https://shop.app/",
    ]) {
      expect(classifyDocumentRequest(url, BASE)).toEqual({
        action: "block",
        reason: "customer-account",
      });
    }
  });

  it("blocks non-http and invalid URLs", () => {
    expect(classifyDocumentRequest("file:///etc/hosts", BASE)).toEqual({
      action: "block",
      reason: "scheme",
    });
    expect(classifyDocumentRequest("data:text/html,hi", BASE)).toEqual({
      action: "block",
      reason: "scheme",
    });
    expect(classifyDocumentRequest("not a url", BASE)).toEqual({
      action: "block",
      reason: "invalid-url",
    });
  });
});

describe("describeCheckoutRoute", () => {
  const SECRETS = /hWN1secretTok|deadbeefcafe|7c0ffee|s3cr3t|SECRETNAME|4242|frag/;
  const shape = (url: string) =>
    describeCheckoutRoute(new URL(url), {
      readable: false,
      problem: "Checkout evidence has no cart ID.",
    });

  it("keeps known route words and masks tokens, numbers, and unknown segments", () => {
    const cases: Array<[string, string, string[]]> = [
      [
        "https://shop.example.com/cart/c/hWN1secretTok?key=deadbeefcafe",
        "/cart/c/:segment",
        ["key"],
      ],
      [
        "https://checkout.example.com/checkouts/cn/hWN1secretTok/information?locale=en&_gl=s3cr3t",
        "/checkouts/cn/:segment/information",
        ["_gl", "locale"],
      ],
      [
        "https://shop.example.com/en-us/cart/41007289630776:1?payment=shop_pay&channel=hydrogen",
        "/:locale/cart/:variant-quantities",
        ["channel", "payment"],
      ],
      ["https://pay.shopify.com/4242/s3cr3t-x/", "/:number/:segment/", []],
      [
        "https://shop.example.com/checkouts/7c0ffee?SECRETNAME4242=1&deadbeefcafe&utm_source=x#frag",
        "/checkouts/:segment",
        [":param", "utm_source"],
      ],
      ["https://shop.example.com/cart/c/%68WN1secretTok", "/cart/c/:segment", []],
    ];
    for (const [url, route, queryNames] of cases) {
      const result = shape(url);
      expect(result.route, url).toBe(route);
      expect(result.queryNames, url).toEqual(queryNames);
      expect(result.origin, url).toBe(new URL(url).origin);
      expect(result.scheme, url).toBe("https");
      expect(JSON.stringify(result), url).not.toMatch(SECRETS);
    }
  });

  it("carries only the fixed cart parser message in a blocked decision", () => {
    const decision = classifyDocumentRequest(
      "https://shop.example.com/checkouts/hWN1secretTok?key=deadbeefcafe",
      BASE,
    );
    expect(decision).toEqual({
      action: "block",
      reason: "checkout",
      route: {
        scheme: "https",
        origin: "https://shop.example.com",
        route: "/checkouts/:segment",
        queryNames: ["key"],
        cart: { readable: false, problem: "The checkout URL has no supported cart reference." },
      },
      checkout: { url: "https://shop.example.com/checkouts/hWN1secretTok?key=deadbeefcafe" },
    });
    const blocked = classifyDocumentRequest(
      "https://shop.example.com/cart/c/hWN1secretTok?key=deadbeefcafe",
      BASE,
    );
    expect(JSON.stringify("route" in blocked ? blocked.route : {})).not.toMatch(SECRETS);
  });
});
