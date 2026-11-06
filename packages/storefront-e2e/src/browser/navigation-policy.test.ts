import { describe, expect, it } from "vitest";

import { classifyDocumentRequest, describeCheckoutRoute } from "./navigation-policy.ts";

const BASE = "https://shop.example.com/";

/** A checkout block: a route shape and the raw URL, with no cart reference. */
function checkoutBlocked(url: string) {
  return {
    action: "block",
    reason: "checkout",
    route: expect.objectContaining({ origin: new URL(url).origin }),
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
      expect(classifyDocumentRequest(url, BASE)).toEqual(checkoutBlocked(url));
    }
  });

  it("blocks cart permalinks on any host and keeps only the URL", () => {
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
          route: "/cart/c/abc123",
          queryNames: expect.arrayContaining(["key"]),
        }),
        checkout: { url },
      });
    }
  });

  it("blocks native and Shop wrapper checkout routes", () => {
    const cases: Array<[string, string]> = [
      [
        "https://shopca.ladygaga.com/checkouts/cn/fixture-native/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true",
        "/checkouts/cn/fixture-native/en-ca/information",
      ],
      [
        "https://www.ohpolly.com/checkouts/cn/fixture-native/en-ca",
        "/checkouts/cn/fixture-native/en-ca",
      ],
      [
        "https://happydad.ca/checkouts/cn/fixture-native/en-ca",
        "/checkouts/cn/fixture-native/en-ca",
      ],
      [
        "https://shop.app/checkout/12345/cn/fixture-native/en-ca",
        "/checkout/12345/cn/fixture-native/en-ca",
      ],
    ];
    for (const [url, route] of cases) {
      expect(classifyDocumentRequest(url, BASE), url).toEqual({
        action: "block",
        reason: "checkout",
        route: expect.objectContaining({ route }),
        checkout: { url },
      });
    }
    const native = classifyDocumentRequest(cases[0]?.[0] ?? "", BASE);
    expect(native).toMatchObject({
      route: { queryNames: ["_r", "auto_redirect", "skip_shop_pay"] },
    });
  });

  it("still blocks insecure, credentialed, ambiguous, and unknown checkout URLs", () => {
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
      expect(classifyDocumentRequest(url, BASE), url).toEqual(checkoutBlocked(url));
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
  const shape = (url: string) => describeCheckoutRoute(new URL(url));

  it("keeps exact pathnames and actual query names without query values or fragments", () => {
    const cases: Array<[string, string, string[]]> = [
      [
        "https://shop.example.com/cart/c/hWN1secretTok?key=deadbeefcafe",
        "/cart/c/hWN1secretTok",
        ["key"],
      ],
      [
        "https://checkout.example.com/checkouts/cn/hWN1secretTok/information?locale=en&_gl=s3cr3t",
        "/checkouts/cn/hWN1secretTok/information",
        ["_gl", "locale"],
      ],
      [
        "https://shop.example.com/en-us/cart/41007289630776:1?payment=shop_pay&channel=hydrogen",
        "/en-us/cart/41007289630776:1",
        ["channel", "payment"],
      ],
      ["https://pay.shopify.com/4242/s3cr3t-x/", "/4242/s3cr3t-x/", []],
      [
        "https://shop.example.com/checkouts/7c0ffee?SECRETNAME4242=1&deadbeefcafe&utm_source=x#frag",
        "/checkouts/7c0ffee",
        ["SECRETNAME4242", "deadbeefcafe", "utm_source"],
      ],
      ["https://shop.example.com/cart/c/%68WN1secretTok", "/cart/c/%68WN1secretTok", []],
      [
        "https://shop.example.com/Checkouts//Token/?z=1&custom=2&z=3",
        "/Checkouts//Token/",
        ["custom", "z"],
      ],
    ];
    for (const [url, route, queryNames] of cases) {
      const result = shape(url);
      expect(result, url).toEqual({
        scheme: "https",
        origin: new URL(url).origin,
        route,
        queryNames,
      });
    }
  });

  it("carries the route shape and raw URL in a blocked decision", () => {
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
        route: "/checkouts/hWN1secretTok",
        queryNames: ["key"],
      },
      checkout: { url: "https://shop.example.com/checkouts/hWN1secretTok?key=deadbeefcafe" },
    });
  });
});
