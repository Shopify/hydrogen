import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { createRedactor } from "../evidence.ts";
import { fakeFetch, sfapi, US_EN } from "../scenarios/test-helpers.ts";
import {
  bindCheckout,
  checkoutSecrets,
  evidenceSecrets,
  fetchCart,
  firstCheckout,
  isCheckoutHandoff,
  isOpaqueId,
  parseCartId,
  parseCheckoutEvidence,
  readCheckoutReference,
  standardEventCartId,
} from "./checkout.ts";
import { createStorefrontApi, StorefrontApiError, StorefrontContextError } from "./storefront.ts";

const signal = new AbortController().signal;

/** The native checkout URL shapes the user reached, with synthetic tokens only. */
const NATIVE_FORMS = [
  "https://shopca.ladygaga.com/checkouts/cn/fixture-native/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true",
  "https://www.ohpolly.com/checkouts/cn/fixture-native/en-ca",
  "https://happydad.ca/checkouts/cn/fixture-native/en-ca",
];

function captured(data: Record<string, unknown>) {
  const parsed = parseCheckoutEvidence(data);
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.reason);
  return parsed.checkout;
}

describe("readCheckoutReference", () => {
  it("reads the native checkout forms with no key and ignores their query parameters", () => {
    for (const url of NATIVE_FORMS) {
      assert.deepEqual(
        readCheckoutReference(new URL(url)),
        {
          found: true,
          form: "native-checkout",
          token: "fixture-native",
          cartId: "gid://shopify/Cart/fixture-native",
        },
        url,
      );
    }
  });

  it("reads permalink, native, and Shop wrapper forms, with an optional locale prefix", () => {
    const cases: Array<[string, string, string]> = [
      ["https://s.example/cart/c/tokA?key=k", "cart-permalink", "gid://shopify/Cart/tokA?key=k"],
      ["https://s.example/en-ca/cart/c/tokA/", "cart-permalink", "gid://shopify/Cart/tokA"],
      ["https://s.example/checkouts/co/tokA", "native-checkout", "gid://shopify/Cart/tokA"],
      [
        "https://s.example/fr-ca/checkouts/cn/tokA/fr-ca/shipping?step=x",
        "native-checkout",
        "gid://shopify/Cart/tokA",
      ],
      [
        "https://shop.app/checkout/12345/cn/tokA/en-ca/information",
        "shop-checkout",
        "gid://shopify/Cart/tokA",
      ],
    ];
    for (const [url, form, cartId] of cases) {
      assert.deepEqual(
        readCheckoutReference(new URL(url)),
        { found: true, form, token: "tokA", cartId },
        url,
      );
    }
  });

  it("keeps the opaque token and key encoding, with no alphabet or length rule", () => {
    const token = `c1-${"Ab9~.!*'()".repeat(40)}`;
    assert.equal(readCheckoutReference(new URL(`https://s.example/cart/c/${token}`)).found, true);
    const cases: Array<[string, string]> = [
      ["key=ab%2Bcd%2Fef%3D%3D", "gid://shopify/Cart/hWN1-x_Y?key=ab%2Bcd%2Fef%3D%3D"],
      // A raw `=` inside the value is base64 padding, not a separator.
      ["key=abcd==", "gid://shopify/Cart/hWN1-x_Y?key=abcd%3D%3D"],
      ["key=a%26b%25c", "gid://shopify/Cart/hWN1-x_Y?key=a%26b%25c"],
      // Tracking parameters are never copied into the cart ID.
      [
        "_gl=1*abc*_ga&key=Zm9v%2Fbar%2B%3D&utm_source=x",
        "gid://shopify/Cart/hWN1-x_Y?key=Zm9v%2Fbar%2B%3D",
      ],
      ["key=a+b", "gid://shopify/Cart/hWN1-x_Y?key=a+b"],
    ];
    for (const [query, cartId] of cases) {
      const reference = readCheckoutReference(
        new URL(`https://s.example/cart/c/hWN1-x_Y?${query}`),
      );
      assert.equal(reference.found && reference.cartId, cartId, query);
    }
    const encoded = readCheckoutReference(new URL("https://s.example/checkouts/cn/a%2Bb%7E"));
    assert.deepEqual(encoded, {
      found: true,
      form: "native-checkout",
      token: "a+b~",
      cartId: "gid://shopify/Cart/a%2Bb%7E",
    });
  });

  it("leaves the reference unresolved for unknown routes, bad syntax, and ambiguous keys", () => {
    const cases: Array<[string, RegExp]> = [
      ["https://s.example/checkouts/xyz/tokA", /no supported cart reference/],
      ["https://s.example/checkouts/cn/", /no supported cart reference/],
      ["https://s.example/cart/41007289630776:1?payment=shop_pay", /no supported cart reference/],
      ["https://s.example/cart/c/tokA/extra", /no supported cart reference/],
      ["https://pay.shopify.com/anything", /no supported cart reference/],
      ["https://s.example/checkouts/cn/t%zzok", /not valid URL syntax/],
      ["https://s.example/checkouts/cn/t%00ok", /not valid URL syntax/],
      ["https://s.example/cart/c/tokA?key=a&key=b", /key is ambiguous/],
      ["https://s.example/cart/c/tokA?key=", /key is ambiguous/],
      ["https://s.example/cart/c/tokA?key=a%zzb", /key is ambiguous/],
      ["https://s.example/cart/c/tokA?key=a%00b", /key is ambiguous/],
    ];
    for (const [url, problem] of cases) {
      const reference = readCheckoutReference(new URL(url));
      assert.equal(reference.found, false, url);
      assert.match(reference.found ? "" : reference.problem, problem, url);
    }
  });
});

describe("parseCheckoutEvidence", () => {
  it("captures the native forms with a keyless cart ID", () => {
    for (const url of NATIVE_FORMS) {
      const checkout = captured({ url });
      assert.equal(checkout.cartId, "gid://shopify/Cart/fixture-native", url);
      assert.equal(checkout.problem, undefined);
    }
  });

  it("keeps a capture with no cart reference, with the problem", () => {
    for (const url of [
      "https://www.example.com/checkouts/xyz/abc",
      "https://www.example.com/cart",
      "https://pay.shopify.com/anything",
    ]) {
      const checkout = captured({ url });
      assert.equal(checkout.cartId, undefined, url);
      assert.match(checkout.problem ?? "", /no supported cart reference/, url);
    }
  });

  it("rejects only missing, invalid, credentialed, or insecure URLs", () => {
    const cases: Array<[unknown, RegExp]> = [
      [undefined, /no URL/],
      ["not a url", /not valid/],
      ["http://www.example.com/checkouts/cn/a", /https/],
      ["ftp://www.example.com/checkouts/cn/a", /https/],
      ["javascript:alert(1)", /https/],
      ["https://user:pw@www.example.com/checkouts/cn/a", /credentials/],
      ["https://user@www.example.com/checkouts/cn/a", /credentials/],
    ];
    for (const [url, reason] of cases) {
      const parsed = parseCheckoutEvidence({ url });
      assert.equal(parsed.ok, false, String(url));
      assert.match(parsed.ok ? "" : parsed.reason, reason, String(url));
    }
  });

  it("allows http only for loopback hosts", () => {
    for (const url of [
      "http://localhost:3000/cart/c/tok?key=k",
      "http://127.0.0.1:3000/cart/c/tok?key=k",
      "http://[::1]:3000/cart/c/tok?key=k",
    ]) {
      assert.equal(parseCheckoutEvidence({ url }).ok, true, url);
    }
  });

  it("uses an observed opaque cart ID unchanged, with no format rule", () => {
    // A different key (keys are response-specific) or no key is the same cart.
    for (const cartId of [
      "gid://shopify/Cart/tokA?key=rotatedKey%2B9",
      "gid://shopify/Cart/tokA",
      "gid://shopify/Cart/tokA?key=k&x=1",
      "opaque-cart-ref~1",
    ]) {
      const checkout = captured({ url: "https://www.example.com/cart/c/tokA?key=k", cartId });
      assert.equal(checkout.cartId, cartId, cartId);
    }
  });

  it("drops an observed cart ID that names another token or is not opaque", () => {
    const other = captured({
      url: "https://www.example.com/cart/c/tokA?key=k",
      cartId: "gid://shopify/Cart/tokB?key=k",
    });
    assert.equal(other.cartId, undefined);
    assert.match(other.problem ?? "", /does not match/);
    // A control character or a space: the URL reference is used instead.
    for (const cartId of ["gid://shopify/Cart/tokB\u0000", "tok B", ""]) {
      const checkout = captured({ url: "https://www.example.com/cart/c/tokA", cartId });
      assert.equal(checkout.cartId, "gid://shopify/Cart/tokA", JSON.stringify(cartId));
    }
  });
});

describe("isOpaqueId", () => {
  it("accepts any bounded string without controls or spaces", () => {
    assert.equal(isOpaqueId("gid://shopify/Cart/x?key=a%2B"), true);
    assert.equal(isOpaqueId("x"), true);
    for (const value of ["", "a b", "a\nb", "a\u007fb", "x".repeat(5000), 7, null]) {
      assert.equal(isOpaqueId(value), false, JSON.stringify(value));
    }
  });
});

describe("parseCartId", () => {
  it("keeps the exact observed ID and decodes the token and key for comparison", () => {
    const id = "gid://shopify/Cart/hWN1abc?key=ab%2Bc%3D";
    assert.deepEqual(parseCartId(id), { id, token: "hWN1abc", key: "ab+c=" });
    assert.deepEqual(parseCartId("gid://shopify/Cart/tok"), {
      id: "gid://shopify/Cart/tok",
      token: "tok",
      key: undefined,
    });
  });

  it("reads no identity from other schemes, authorities, extra parameters, controls, and bad escapes", () => {
    for (const id of [
      "gid://shopify/Product/1",
      "gid://user@shopify/Cart/tok?key=k",
      "gid://shopify.evil/Cart/tok?key=k",
      "https://shopify/Cart/tok?key=k",
      "gid://shopify/Cart/",
      "gid://shopify/Cart/?key=k",
      "gid://shopify/Cart/a/b?key=k",
      "gid://shopify/Cart/tok?key=k&x=1",
      "gid://shopify/Cart/tok?key=k&",
      "gid://shopify/Cart/tok?key=a&key=b",
      "gid://shopify/Cart/tok?other=k",
      "gid://shopify/Cart/tok?key=",
      "gid://shopify/Cart/tok?key=k#frag",
      "gid://shopify/Cart/tok?key=a%zz",
      "gid://shopify/Cart/tok?key=a%00",
      "gid://shopify/Cart/t%0Aok?key=k",
      "gid://shopify/Cart/tok?key=a b",
      "gid://shopify/Cart/tok?key=a\nb",
      " gid://shopify/Cart/tok?key=k",
    ]) {
      assert.equal(parseCartId(id), undefined, JSON.stringify(id));
    }
  });
});

describe("bindCheckout", () => {
  const permalink = "https://checkout.example.com/cart/c/tok123?key=k1";
  const bind = (url: string, checkoutUrl = permalink, token: string | undefined = "tok123") =>
    bindCheckout(new URL(url), { token, checkoutUrl });

  it("binds the API checkout URL on a custom or unrelated domain", () => {
    assert.equal(bind(permalink).status, "bound");
    const unrelated = "https://shop.ladygaga.com/cart/c/tok123?key=k1";
    assert.equal(bind(unrelated, unrelated).status, "bound");
  });

  it("binds a native route to an API permalink for the same cart, and the reverse", () => {
    for (const url of NATIVE_FORMS) {
      const origin = new URL(url).origin;
      const api = `${origin}/cart/c/fixture-native?key=apiKey1`;
      const result = bind(url, api, "fixture-native");
      assert.equal(result.status, "bound", url);
      assert.deepEqual(result.status === "bound" && result.diagnostics, {
        capturedOrigin: origin,
        apiOrigin: origin,
        capturedForm: "native-checkout",
        apiForm: "cart-permalink",
        exactApiQuery: false,
      });
    }
    const reverse = bind(
      "https://checkout.example.com/cart/c/tok123",
      "https://checkout.example.com/checkouts/cn/tok123/en-us/information",
    );
    assert.equal(reverse.status, "bound");
  });

  it("binds through the API checkout URL reference when the cart ID is not a Cart GID", () => {
    const result = bindCheckout(new URL("https://checkout.example.com/checkouts/cn/tok123/en-ca"), {
      token: undefined,
      checkoutUrl: "https://checkout.example.com/cart/c/tok123?key=k",
    });
    assert.equal(result.status === "bound" && result.via, "checkout-url");
  });

  it("treats key, tracking, locale, step, encoding, and host case differences as the same cart", () => {
    for (const url of [
      "https://CHECKOUT.example.com:443/cart/c/tok123?key=other",
      "https://checkout.example.com/cart/c/%74ok123/",
      "https://checkout.example.com/cart/c/tok123?_gl=x&utm_source=y",
      "https://checkout.example.com/checkouts/cn/tok123/fr-ca/shipping?step=x&_r=y",
    ]) {
      const result = bind(url);
      assert.equal(result.status, "bound", url);
    }
    // Exact API query equality is only a diagnostic.
    const exact = bind("https://checkout.example.com/cart/c/tok123?key=k1&_ga=1");
    assert.equal(exact.status === "bound" && exact.diagnostics.exactApiQuery, true);
    const other = bind("https://checkout.example.com/cart/c/tok123?key=k2");
    assert.equal(other.status === "bound" && other.diagnostics.exactApiQuery, false);
  });

  it("never binds an unrelated token, a substring, or a different case", () => {
    for (const url of [
      "https://checkout.example.com/cart/c/other?key=k1",
      "https://checkout.example.com/cart/c/tok1234?key=k1",
      "https://checkout.example.com/checkouts/cn/xtok123",
      "https://checkout.example.com/cart/c/TOK123?key=k1",
    ]) {
      assert.equal(bind(url).status, "unbound", url);
    }
  });

  it("binds an unrecognized route only by a whole decoded private segment", () => {
    assert.equal(bind("https://checkout.example.com/checkouts/zz/tok123/x").status, "bound");
    assert.equal(bind("https://checkout.example.com/checkouts/zz/tok1234").status, "unbound");
    assert.equal(bind("https://checkout.example.com/checkouts/zz?ref=tok123").status, "unbound");
  });

  it("binds the same cart on any origin, such as a wrapper, sibling, or port; origins stay diagnostics", () => {
    for (const url of [
      "https://www.example.com/cart/c/tok123?key=k1",
      "https://checkout.example.com:8443/cart/c/tok123?key=k1",
      "https://shop.app/checkout/12345/cn/tok123/en-ca",
    ]) {
      const result = bind(url);
      assert.equal(result.status, "bound", url);
      assert.equal(
        result.status === "bound" && result.diagnostics.capturedOrigin,
        new URL(url).origin,
      );
      assert.equal(
        result.status === "bound" && result.diagnostics.apiOrigin,
        "https://checkout.example.com",
      );
    }
    assert.equal(
      bind("http://localhost:4000/cart/c/t?key=k", "http://127.0.0.1:4000/cart/c/t?key=k", "t")
        .status,
      "bound",
    );
  });

  it("never binds another cart on another origin", () => {
    for (const url of [
      "https://shop.app/checkout/12345/cn/other/en-ca",
      "https://www.example.com/cart/c/tok1234?key=k1",
    ]) {
      assert.equal(bind(url).status, "unbound", url);
    }
  });

  it("names origins and route forms only, never tokens or keys", () => {
    for (const result of [
      bind("https://evil.test/cart/c/tok123?key=secretKeyA"),
      bind("https://checkout.example.com/cart/c/secretTokenB?key=k1"),
      bind("https://checkout.example.com/checkouts/cn/tok123?key=secretKeyC"),
    ]) {
      assert.doesNotMatch(JSON.stringify(result), /secretToken|secretKey|tok123|k1/);
    }
  });

  it("treats a missing, malformed, or unsafe API checkout URL as invalid", () => {
    for (const checkoutUrl of [
      "",
      "/cart/c/tok123?key=k1",
      "not a url",
      "javascript:alert(1)",
      "http://checkout.example.com/cart/c/tok123?key=k1",
      "https://user:pw@checkout.example.com/cart/c/tok123?key=k1",
    ]) {
      assert.equal(bind(permalink, checkoutUrl).status, "invalid", checkoutUrl);
    }
  });
});

describe("firstCheckout", () => {
  it("returns undefined when none was captured and uses only the first handoff", () => {
    assert.equal(firstCheckout([{ kind: "standard-event", timestamp: 1, data: {} }]), undefined);
    const parsed = firstCheckout([
      {
        kind: "checkout",
        timestamp: 1,
        data: { url: "https://www.example.com/cart/c/first?key=k" },
      },
      {
        kind: "checkout",
        timestamp: 2,
        data: { url: "https://www.example.com/cart/c/second?key=k" },
      },
    ]);
    assert.equal(parsed?.ok && parsed.checkout.cartId, "gid://shopify/Cart/first?key=k");
    const unsafeFirst = firstCheckout([
      { kind: "checkout", timestamp: 1, data: { url: "http://evil.test/cart/c/first" } },
      {
        kind: "checkout",
        timestamp: 2,
        data: { url: "https://www.example.com/cart/c/second?key=k" },
      },
    ]);
    assert.equal(unsafeFirst?.ok, false);
  });
});

describe("isCheckoutHandoff", () => {
  it("matches checkout records and top-level checkout navigation blocks only", () => {
    assert.equal(isCheckoutHandoff({ kind: "checkout", timestamp: 1, data: {} }), true);
    const blocked = (data: Record<string, unknown>) =>
      isCheckoutHandoff({ kind: "navigation-blocked", timestamp: 1, data });
    assert.equal(blocked({ reason: "checkout", frame: "top-level" }), true);
    // Fail closed: an unclassified or legacy record still stops the buyer.
    assert.equal(blocked({ reason: "checkout", frame: "unknown" }), true);
    assert.equal(blocked({ reason: "checkout" }), true);
    // An embedded checkout frame stays blocked but is not the buyer's handoff.
    assert.equal(blocked({ reason: "checkout", frame: "embedded" }), false);
    assert.equal(blocked({ reason: "customer-account", frame: "top-level" }), false);
    assert.equal(blocked({ reason: "scheme" }), false);
  });
});

describe("checkoutSecrets", () => {
  it("returns cart ID, token, key, and query values but never the host", () => {
    const secrets = checkoutSecrets({
      url: "https://checkout.custom-shop.com/cart/c/hWN1secretToken99?key=deadbeefcafe1234",
      cartId: "gid://shopify/Cart/hWN1secretToken99?key=deadbeefcafe1234",
    });
    assert.ok(secrets.includes("hWN1secretToken99"));
    assert.ok(secrets.includes("deadbeefcafe1234"));
    assert.ok(secrets.includes("gid://shopify/Cart/hWN1secretToken99?key=deadbeefcafe1234"));
    // The full URL is a literal secret, but no secret is the host or a part of it.
    assert.ok(
      secrets.includes(
        "https://checkout.custom-shop.com/cart/c/hWN1secretToken99?key=deadbeefcafe1234",
      ),
    );
    assert.equal(
      secrets.some((secret) => "checkout.custom-shop.com".includes(secret)),
      false,
    );
    const redactor = createRedactor();
    for (const secret of secrets) redactor.addSecret(secret);
    assert.equal(
      redactor.text("host checkout.custom-shop.com /cart/c/:segment"),
      "host checkout.custom-shop.com /cart/c/:segment",
    );
  });

  it("returns the full URL and every private part of a native, wrapper, or unknown URL", () => {
    const urls = [
      "https://shopca.ladygaga.com/checkouts/cn/fixtureNative1/en-ca/information?_r=fixtureR123&auto_redirect=false&skip_shop_pay=true",
      "https://shop.app/checkout/12345/cn/fixtureWrap99/en-ca?privateName7=valueX9",
      "https://shop.example.com/checkouts/zz/fixtureUnknown5/%66ixtureEnc77?opaqueparam",
    ];
    const privateParts = [
      "fixtureNative1",
      "fixtureR123",
      "fixtureWrap99",
      "privateName7",
      "valueX9",
      "fixtureUnknown5",
      "%66ixtureEnc77",
      "fixtureEnc77",
      "opaqueparam",
    ];
    const redactor = createRedactor();
    for (const url of urls) {
      for (const secret of checkoutSecrets({ url })) redactor.addSecret(secret);
    }
    const text = redactor.text(
      `${urls.join(" ")} ${privateParts.join(" ")} hosts shopca.ladygaga.com shop.app shop.example.com route /checkouts/cn/:segment/:locale/information`,
    );
    for (const part of [...urls, ...privateParts]) {
      assert.equal(text.includes(part), false, part);
    }
    assert.match(text, /shopca\.ladygaga\.com shop\.app shop\.example\.com/);
    assert.match(text, /\/checkouts\/cn\/:segment\/:locale\/information/);
    // Public words, locales, and numbers are not literal secrets.
    const secrets = urls.flatMap((url) => checkoutSecrets({ url }));
    for (const word of ["checkouts", "cn", "information", "en-ca", "12345", "shop.app"]) {
      assert.equal(secrets.includes(word), false, word);
    }
  });

  it("returns decoded and encoded forms of an opaque key, so the redactor hides both", () => {
    const secrets = checkoutSecrets({
      url: "https://checkout.example.com/cart/c/hWN1secretTok%7E99?key=Zm9vYmFy%2Bc2VjcmV0%2F%3D%3D",
      cartId: "gid://shopify/Cart/hWN1secretTok%7E99?key=Zm9vYmFy%2Bc2VjcmV0%2F%3D%3D",
    });
    for (const secret of [
      "hWN1secretTok%7E99",
      "hWN1secretTok~99",
      "Zm9vYmFy+c2VjcmV0/==",
      "Zm9vYmFy%2Bc2VjcmV0%2F%3D%3D",
    ]) {
      assert.ok(secrets.includes(secret), secret);
    }
    const redactor = createRedactor();
    for (const secret of secrets) redactor.addSecret(secret);
    const text = redactor.text(
      "key Zm9vYmFy+c2VjcmV0/== raw Zm9vYmFy%2Bc2VjcmV0%2F%3D%3D tok hWN1secretTok~99",
    );
    assert.doesNotMatch(text, /Zm9vYmFy|c2VjcmV0|hWN1secretTok/);
  });
});

const CART_ID = "gid://shopify/Cart/tok?key=k";
const CHECKOUT_URL = "https://checkout.example.com/cart/c/tok?key=k";

function cartPage(
  lines: Array<[string, number]>,
  hasNextPage: boolean,
  totalQuantity = 1,
  overrides: Record<string, unknown> = {},
) {
  return {
    body: sfapi({
      cart: {
        id: CART_ID,
        checkoutUrl: CHECKOUT_URL,
        totalQuantity,
        buyerIdentity: { countryCode: null },
        lines: {
          pageInfo: { hasNextPage, endCursor: hasNextPage ? "next" : null },
          nodes: lines.map(([id, quantity]) => ({ quantity, merchandise: { id } })),
        },
        ...overrides,
      },
    }),
  };
}

describe("fetchCart", () => {
  it("reads every page of cart lines with the cart ID and checkout URL", async () => {
    const { fetch, requests } = fakeFetch([
      cartPage([["v1", 1]], true, 2),
      cartPage([["v2", 1]], false, 2),
    ]);
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    const result = await fetchCart(api, CART_ID, US_EN, signal);
    assert.deepEqual(result, {
      status: "complete",
      cart: {
        id: CART_ID,
        token: "tok",
        checkoutUrl: CHECKOUT_URL,
        totalQuantity: 2,
        buyerCountry: null,
        lines: [
          { variantId: "v1", quantity: 1 },
          { variantId: "v2", quantity: 1 },
        ],
      },
    });
    assert.equal(requests[1]?.variables.after, "next");
    // Only the configured API origin is called, never the checkout host.
    assert.deepEqual(
      requests.map((request) => request.url),
      Array.from({ length: 2 }, () => "https://www.example.com/api/2026-10/graphql.json"),
    );
    assert.match(requests[0]?.query ?? "", /\bid\b[\s\S]*\bcheckoutUrl\b/);
    // Every page carries the explicit run context and reads the buyer identity country.
    for (const request of requests) {
      assert.match(request.query, /@inContext\(country: \$country, language: \$language\)/);
      assert.match(request.query, /buyerIdentity \{ countryCode \}/);
      assert.equal(request.variables.country, "US");
      assert.equal(request.variables.language, "EN");
    }
  });

  it("confirms a matching buyer identity country and keeps a null one unconfirmed", async () => {
    const matching = fakeFetch([
      cartPage([["v1", 1]], false, 1, { buyerIdentity: { countryCode: "US" } }),
    ]);
    const confirmed = await fetchCart(
      createStorefrontApi({ origin: "https://www.example.com", fetch: matching.fetch }),
      CART_ID,
      US_EN,
      signal,
    );
    assert.equal(confirmed.status === "complete" && confirmed.cart.buyerCountry, "US");
    const unset = fakeFetch([cartPage([["v1", 1]], false)]);
    const unconfirmed = await fetchCart(
      createStorefrontApi({ origin: "https://www.example.com", fetch: unset.fetch }),
      CART_ID,
      US_EN,
      signal,
    );
    assert.equal(unconfirmed.status === "complete" && unconfirmed.cart.buyerCountry, null);
  });

  it("reports a conflicting buyer identity country as a context mismatch, not a cart result", async () => {
    const { fetch } = fakeFetch([
      cartPage([["v1", 1]], false, 1, { buyerIdentity: { countryCode: "CA" } }),
    ]);
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    const result = await fetchCart(api, CART_ID, US_EN, signal);
    assert.equal(result.status, "context-mismatch");
    assert.match(result.status === "context-mismatch" ? result.reason : "", /CA.*US/);
  });

  it("rejects a cart page answered in another API context", async () => {
    const page = cartPage([["v1", 1]], false);
    const { fetch } = fakeFetch([
      { body: { ...page.body, extensions: { context: { country: "CA", language: "EN" } } } },
    ]);
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    await assert.rejects(fetchCart(api, CART_ID, US_EN, signal), StorefrontContextError);
  });

  it("rejects a cart whose identity, checkout URL, or total changes during pagination", async () => {
    for (const overrides of [
      { id: "gid://shopify/Cart/other?key=k" },
      { checkoutUrl: "https://evil.test/cart/c/tok?key=k" },
      { totalQuantity: 9 },
      { buyerIdentity: { countryCode: "US" } },
    ]) {
      const { fetch } = fakeFetch([
        cartPage([["v1", 1]], true, 2),
        cartPage([["v2", 1]], false, 2, overrides),
      ]);
      const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
      const result = await fetchCart(api, CART_ID, US_EN, signal);
      assert.deepEqual(
        result,
        { status: "incomplete", reason: "The cart changed during pagination." },
        JSON.stringify(overrides),
      );
    }
  });

  it("sends the observed cart ID unchanged and identifies the returned cart by token only", async () => {
    const requested = "gid://shopify/Cart/hWN1tok?key=ab%2Bcd%2F%3D%3D";
    for (const [returned, status] of [
      [requested, "complete"],
      // The key is response-specific: a rotated key, or no key, is the same cart.
      ["gid://shopify/Cart/hWN1tok?key=rotated%2Fkey%3D", "complete"],
      ["gid://shopify/Cart/hWN1tok?key=ab+cd", "complete"],
      ["gid://shopify/Cart/hWN1tok", "complete"],
      ["gid://shopify/Cart/otherTok?key=ab%2Bcd%2F%3D%3D", "incomplete"],
    ] as const) {
      const { fetch, requests } = fakeFetch([cartPage([["v1", 1]], false, 1, { id: returned })]);
      const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
      const result = await fetchCart(api, requested, US_EN, signal);
      assert.equal(result.status, status, returned);
      // The request ID is never stripped or rewritten.
      assert.equal(requests[0]?.variables.id, requested);
    }
  });

  it("accepts a rotated key on a later page but not a changed token", async () => {
    const pages = (secondId: string) =>
      fakeFetch([
        cartPage([["v1", 1]], true, 2, { id: "gid://shopify/Cart/tok?key=first" }),
        cartPage([["v2", 1]], false, 2, { id: secondId }),
      ]);
    const rotated = pages("gid://shopify/Cart/tok?key=second%2B");
    const complete = await fetchCart(
      createStorefrontApi({ origin: "https://www.example.com", fetch: rotated.fetch }),
      CART_ID,
      US_EN,
      signal,
    );
    assert.equal(complete.status, "complete");
    assert.deepEqual(
      rotated.requests.map((request) => request.variables.id),
      [CART_ID, CART_ID],
    );
    const changed = pages("gid://shopify/Cart/other?key=first");
    assert.deepEqual(
      await fetchCart(
        createStorefrontApi({ origin: "https://www.example.com", fetch: changed.fetch }),
        CART_ID,
        US_EN,
        signal,
      ),
      { status: "incomplete", reason: "The cart changed during pagination." },
    );
  });

  it("does not force the Cart GID format on a returned cart ID", async () => {
    // The checkout URL binding decides for other formats. The ID is kept unchanged.
    for (const id of [
      "gid://shopify/Cart/tok?key=k&x=1",
      "gid://shopify/Cart/tok?other=k",
      "opaque-cart-ref",
      "",
    ]) {
      const firstPage = fakeFetch([cartPage([["v1", 1]], false, 1, { id })]);
      const result = await fetchCart(
        createStorefrontApi({ origin: "https://www.example.com", fetch: firstPage.fetch }),
        CART_ID,
        US_EN,
        signal,
      );
      assert.equal(result.status === "complete" && result.cart.id, id, id);
      assert.equal(result.status === "complete" && result.cart.token, undefined, id);
    }
    // A readable token that later becomes unreadable is a changed cart.
    const laterPage = fakeFetch([
      cartPage([["v1", 1]], true, 2),
      cartPage([["v2", 1]], false, 2, { id: "opaque-cart-ref" }),
    ]);
    assert.deepEqual(
      await fetchCart(
        createStorefrontApi({ origin: "https://www.example.com", fetch: laterPage.fetch }),
        CART_ID,
        US_EN,
        signal,
      ),
      { status: "incomplete", reason: "The cart changed during pagination." },
    );
  });

  it("sends an opaque non-GID cart ID unchanged and keeps its pages stable", async () => {
    const { fetch, requests } = fakeFetch([
      cartPage([["v1", 1]], true, 2, { id: "opaque:ref~1" }),
      cartPage([["v2", 1]], false, 2, { id: "opaque:ref~1" }),
    ]);
    const result = await fetchCart(
      createStorefrontApi({ origin: "https://www.example.com", fetch }),
      "opaque:ref~1",
      US_EN,
      signal,
    );
    assert.equal(result.status, "complete");
    assert.deepEqual(
      requests.map((request) => request.variables.id),
      ["opaque:ref~1", "opaque:ref~1"],
    );
  });

  it("rejects a cart ID for another cart", async () => {
    const { fetch } = fakeFetch([
      cartPage([["v1", 1]], false, 1, { id: "gid://shopify/Cart/other?key=k" }),
    ]);
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    const result = await fetchCart(api, CART_ID, US_EN, signal);
    assert.equal(result.status, "incomplete");
  });

  it("rejects a missing or malformed checkout URL or cart ID as an API error", async () => {
    for (const overrides of [{ checkoutUrl: null }, { checkoutUrl: 7 }, { id: undefined }]) {
      const { fetch } = fakeFetch([cartPage([["v1", 1]], false, 1, overrides)]);
      const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
      await assert.rejects(fetchCart(api, CART_ID, US_EN, signal), StorefrontApiError);
    }
  });

  it("rejects a partial read when the page cap is reached", async () => {
    const { fetch } = fakeFetch(Array.from({ length: 10 }, () => cartPage([["v1", 1]], true)));
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    const result = await fetchCart(api, CART_ID, US_EN, signal);
    assert.equal(result.status, "incomplete");
  });

  it("reports a missing cart", async () => {
    const { fetch } = fakeFetch([{ body: sfapi({ cart: null }) }]);
    const api = createStorefrontApi({ origin: "https://www.example.com", fetch });
    assert.deepEqual(await fetchCart(api, CART_ID, US_EN, signal), { status: "missing" });
  });
});

function cartEvent(
  name: string,
  phase: string,
  cart: unknown,
  extra: Record<string, unknown> = {},
) {
  const part = phase === "settled" ? { result: { cart, ...extra } } : { input: { cart } };
  return {
    kind: "standard-event",
    timestamp: 1,
    data: { event: { id: "e1", name, action: "add", phase }, ...part },
  };
}

describe("standardEventCartId", () => {
  const handoff = { kind: "navigation-blocked", timestamp: 2, data: { reason: "checkout" } };

  it("returns the latest error-free lines update or cart view before the handoff, unchanged", () => {
    const opaque = "opaque:Cart~ref+1";
    assert.equal(
      standardEventCartId([
        cartEvent("shopify:cart:lines-update", "settled", { id: "gid://shopify/Cart/first" }),
        cartEvent("shopify:cart:view", "input", { id: opaque }),
        handoff,
        cartEvent("shopify:cart:lines-update", "settled", { id: "gid://shopify/Cart/after" }),
      ]),
      opaque,
    );
  });

  it("ignores failed, user-error, input-phase, missing, and unsafe cart IDs", () => {
    assert.equal(
      standardEventCartId([
        cartEvent(
          "shopify:cart:lines-update",
          "settled",
          { id: "gid://shopify/Cart/a" },
          {
            userErrors: [{ message: "Sold out" }],
          },
        ),
        cartEvent("shopify:cart:lines-update", "input", { id: "gid://shopify/Cart/b" }),
        cartEvent("shopify:cart:lines-update", "failed", { id: "gid://shopify/Cart/c" }),
        cartEvent("shopify:cart:view", "input", { id: "bad\u0000id" }),
        cartEvent("shopify:cart:view", "input", { id: "" }),
        cartEvent("shopify:cart:view", "input", null),
        handoff,
      ]),
      undefined,
    );
    assert.equal(standardEventCartId([]), undefined);
  });
});

describe("evidenceSecrets", () => {
  it("registers Standard Event cart IDs of any format, and nothing for other records", () => {
    assert.deepEqual(
      evidenceSecrets(cartEvent("shopify:cart:view", "input", { id: "opaqueCartRef9" })),
      ["opaqueCartRef9"],
    );
    assert.deepEqual(
      evidenceSecrets(
        cartEvent("shopify:cart:lines-update", "settled", {
          id: "gid://shopify/Cart/hWN1tok?key=k%2B1",
        }),
      ),
      ["gid://shopify/Cart/hWN1tok?key=k%2B1", "hWN1tok", "k+1", "k%2B1"],
    );
    assert.deepEqual(evidenceSecrets({ kind: "screenshot", timestamp: 1, data: {} }), []);
    assert.ok(
      evidenceSecrets({
        kind: "checkout",
        timestamp: 1,
        data: { url: "https://s.example/checkouts/cn/fixtureTok77" },
      }).includes("fixtureTok77"),
    );
  });
});
