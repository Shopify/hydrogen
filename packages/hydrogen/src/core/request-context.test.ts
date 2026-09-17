import { describe, it, expect } from "vitest";

import {
  CONSENT_MANAGEMENT_HEADER,
  HYDROGEN_VERSION_HEADER,
  REQUEST_GROUP_ID_HEADER,
  SDK_VARIANT_HEADER,
  SDK_VARIANT_SOURCE_HEADER,
  SDK_VERSION_HEADER,
  SHOPIFY_STOREFRONT_ORIGIN_HEADER,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from "./headers";
import type { ShopifyI18n } from "./i18n/types";
import { createShopifyRequestContext } from "./request-context";

const DEFAULT_LOCALE = { country: "US", language: "EN" } as const;
const DEFAULT_I18N = { defaultLocale: DEFAULT_LOCALE } as const satisfies ShopifyI18n;
const PATHNAME_I18N = {
  defaultLocale: DEFAULT_LOCALE,
  routing: {
    type: "pathname",
    locales: [
      { language: "ES", country: "ES" },
      { language: "FR", country: "CA" },
    ],
  },
} as const satisfies ShopifyI18n;

type StorefrontRequest = Pick<Request, "headers"> &
  Partial<Pick<Request, "method" | "signal" | "url">>;

function createTestRequestContext(request: StorefrontRequest, i18n: ShopifyI18n = DEFAULT_I18N) {
  return createShopifyRequestContext({ request, i18n });
}

describe("createShopifyRequestContext", () => {
  it("requires i18n", () => {
    expect(() =>
      createShopifyRequestContext({
        request: { headers: new Headers() },
      } as never),
    ).toThrow("i18n from defineShopifyI18n (with a defaultLocale) is required");
  });

  it("does not generate tracking tokens from a request", () => {
    const request = new Request("https://example.com/products/snowboard");

    const result = createTestRequestContext(request);

    expect(result.url).toBe("https://example.com/products/snowboard");
    expect(result.storefrontOrigin).toBe("https://example.com");
    expect(result.requestGroupId).toBeTruthy();
    expect(result.uniqueToken).toBeUndefined();
    expect(result.visitToken).toBeUndefined();
  });

  it("keeps a reference to the request signal", () => {
    const controller = new AbortController();
    const request = new Request("https://example.com/products/snowboard", {
      signal: controller.signal,
    });

    const result = createTestRequestContext(request);

    expect(result.signal).toBe(request.signal);
    controller.abort();
    expect(result.signal?.aborted).toBe(true);
  });

  it("uses the forwarded storefront URL header when input has no URL", () => {
    const result = createTestRequestContext({
      headers: new Headers({ "x-storefront-url": "https://example.com/products/snowboard" }),
    });

    expect(result.url).toBe("https://example.com/products/snowboard");
    expect(result.storefrontOrigin).toBe("https://example.com");
    const headers = new Headers();
    result.applyStorefrontRequestHeaders(headers);
    expect(headers.get(SHOPIFY_STOREFRONT_ORIGIN_HEADER)).toBe("https://example.com");
  });

  it("stores the i18n definition and the locale matched from the request URL", () => {
    const result = createTestRequestContext(
      new Request("https://shop.example.com/es-es/products/snowboard"),
      PATHNAME_I18N,
    );

    expect(result.i18n).toBe(PATHNAME_I18N);
    expect(result.locale).toEqual({
      country: "ES",
      language: "ES",
      pathPrefix: "/es-es",
    });
  });

  it("uses an explicit locale override instead of matching the URL", () => {
    const result = createShopifyRequestContext({
      request: new Request("https://shop.example.com/es-es/products/snowboard"),
      i18n: PATHNAME_I18N,
      locale: { language: "FR", country: "CA" },
    });

    expect(result.locale).toEqual({ country: "CA", language: "FR", pathPrefix: "/fr-ca" });
  });

  it("rejects a locale override that is not in the definition", () => {
    expect(() =>
      createShopifyRequestContext({
        request: new Request("https://shop.example.com/"),
        i18n: PATHNAME_I18N,
        locale: { language: "DE", country: "DE" },
      }),
    ).toThrow("Locale DE-DE is not defined in this storefront's i18n");
  });

  it("stores trusted buyer IP metadata", () => {
    const buyerIp = "1.2.3.4";

    const result = createShopifyRequestContext({
      request: new Request("https://example.com"),
      i18n: DEFAULT_I18N,
      buyerIp,
    });

    expect(result.buyerIp).toBe(buyerIp);
  });

  it("rejects an empty buyer IP", () => {
    expect(() =>
      createShopifyRequestContext({
        request: new Request("https://example.com"),
        i18n: DEFAULT_I18N,
        buyerIp: "",
      }),
    ).toThrow("buyerIp must be non-empty when provided");
  });

  it("treats an undefined buyer IP as absent", () => {
    const result = createShopifyRequestContext({
      request: new Request("https://example.com"),
      i18n: DEFAULT_I18N,
      buyerIp: undefined,
    });

    expect(result).not.toHaveProperty("buyerIp");
  });

  it("defaults pathPrefix to an empty string", () => {
    const result = createTestRequestContext({ headers: new Headers() });

    expect(result.locale).toEqual({ ...DEFAULT_LOCALE, pathPrefix: "" });
  });

  it("resolves the default locale with an empty pathPrefix for unprefixed URLs", () => {
    const result = createTestRequestContext(
      new Request("https://shop.example.com/products/snowboard"),
      PATHNAME_I18N,
    );

    expect(result.locale).toEqual({ ...DEFAULT_LOCALE, pathPrefix: "" });
  });

  it("derives pathPrefix with a leading slash and no trailing slash from the URL", () => {
    const result = createTestRequestContext(
      new Request("https://shop.example.com/es-es/"),
      PATHNAME_I18N,
    );

    expect(result.locale.pathPrefix).toBe("/es-es");
  });

  it("matches the locale prefix case-insensitively", () => {
    const result = createTestRequestContext(
      new Request("https://shop.example.com/FR-CA/products/snowboard"),
      PATHNAME_I18N,
    );

    expect(result.locale.pathPrefix).toBe("/fr-ca");
  });

  it("falls back to the default locale for an unknown prefix", () => {
    const result = createTestRequestContext(
      new Request("https://shop.example.com/de-de/products/snowboard"),
      PATHNAME_I18N,
    );

    expect(result.locale).toEqual({ ...DEFAULT_LOCALE, pathPrefix: "" });
  });

  it("does not create tracking tokens when modern Shopify analytics cookies are present", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: { cookie: "_shopify_analytics=1; _shopify_marketing=1" },
      }),
    );

    expect(result.cookie).toBe("_shopify_analytics=1; _shopify_marketing=1");
    expect(result.uniqueToken).toBeUndefined();
    expect(result.visitToken).toBeUndefined();
  });

  it("reuses legacy tracking cookies when only the Shopify essential cookie is present", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: {
          cookie:
            "_shopify_essential=declined-session; _shopify_y=unique-token; _shopify_s=visit-token",
        },
      }),
    );

    expect(result.uniqueToken).toBe("unique-token");
    expect(result.visitToken).toBe("visit-token");
    expect(result.legacyTokens).toBe(true);
  });

  it("reuses legacy Shopify tracking cookies when present", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: { cookie: "_shopify_y=unique-token; _shopify_s=visit-token" },
      }),
    );

    expect(result.uniqueToken).toBe("unique-token");
    expect(result.visitToken).toBe("visit-token");
    expect(result.legacyTokens).toBe(true);
  });

  it("does not reuse legacy Shopify tracking cookies when modern analytics cookies are present", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: {
          cookie:
            "_shopify_analytics=1; _shopify_marketing=1; _shopify_y=unique-token; _shopify_s=visit-token",
        },
      }),
    );

    expect(result.uniqueToken).toBeUndefined();
    expect(result.visitToken).toBeUndefined();
    expect(result.legacyTokens).toBeUndefined();
  });

  it("uses x-request-id as the default request group id", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: { "x-request-id": "incoming-request-id" },
      }),
    );

    expect(result.requestGroupId).toBe("incoming-request-id");
  });

  it("falls back to request-id for the default request group id", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: { "request-id": "incoming-request-id" },
      }),
    );

    expect(result.requestGroupId).toBe("incoming-request-id");
  });

  it("reuses tracking tokens forwarded in request headers", () => {
    const result = createTestRequestContext(
      new Request("https://example.com", {
        headers: {
          [SHOPIFY_UNIQUE_TOKEN_HEADER]: "forwarded-unique-token",
          [SHOPIFY_VISIT_TOKEN_HEADER]: "forwarded-visit-token",
        },
      }),
    );

    expect(result.requestGroupId).toBeTruthy();
    expect(result.uniqueToken).toBe("forwarded-unique-token");
    expect(result.visitToken).toBe("forwarded-visit-token");
  });

  it("gets forwarded request headers for handing off through a proxy", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/products/snowboard", {
        headers: {
          accept: "text/html",
          cookie: "_shopify_y=unique-token; _shopify_s=visit-token",
          "x-request-id": "incoming-request-id",
        },
      }),
    );

    const headers = context.getForwardedRequestHeaders();

    expect(headers.get("accept")).toBe("text/html");
    expect(headers.get("cookie")).toBe("_shopify_y=unique-token; _shopify_s=visit-token");
    expect(headers.get("x-storefront-url")).toBe("https://example.com/products/snowboard");
    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBe("incoming-request-id");
    expect(headers.get(SHOPIFY_STOREFRONT_ORIGIN_HEADER)).toBe("https://example.com");
    expect(headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_VISIT_TOKEN_HEADER)).toBe("visit-token");
    expect(headers.get(SHOPIFY_STOREFRONT_Y_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_STOREFRONT_S_HEADER)).toBe("visit-token");
  });

  it("does not mutate the original request headers when getting forwarded request headers", () => {
    const originalHeaders = new Headers({ accept: "text/html" });
    const context = createTestRequestContext({
      headers: originalHeaders,
      url: "https://example.com",
    });

    const headers = context.getForwardedRequestHeaders();

    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBeTruthy();
    expect(originalHeaders.get(REQUEST_GROUP_ID_HEADER)).toBeNull();
  });

  it("applies storefront request headers from only storefront context", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/products/snowboard", {
        headers: {
          accept: "text/html",
          cookie: "_shopify_y=unique-token; _shopify_s=visit-token",
          "x-random": "not-forwarded",
          "x-request-id": "incoming-request-id",
        },
      }),
    );

    const headers = new Headers({
      [SHOPIFY_STOREFRONT_ORIGIN_HEADER]: "https://untrusted.example",
      "x-custom": "preserved",
    });
    context.applyStorefrontRequestHeaders(headers);

    expect(headers.get("accept")).toBeNull();
    expect(headers.get("x-random")).toBeNull();
    expect(headers.get("x-storefront-url")).toBeNull();
    expect(headers.get("content-type")).toBeNull();
    expect(headers.get("x-shopify-storefront-access-token")).toBeNull();
    expect(headers.get("x-custom")).toBe("preserved");
    expect(headers.get(SDK_VARIANT_HEADER)).toBe("hydrogen");
    expect(headers.get(SDK_VARIANT_SOURCE_HEADER)).toBe("kit");
    expect(headers.get(SDK_VERSION_HEADER)).toBe("2026-04");
    expect(headers.get(HYDROGEN_VERSION_HEADER)).toBeTruthy();
    expect(headers.get("cookie")).toBe("_shopify_y=unique-token; _shopify_s=visit-token");
    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBe("incoming-request-id");
    expect(headers.get(SHOPIFY_STOREFRONT_ORIGIN_HEADER)).toBe("https://example.com");
    expect(headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_VISIT_TOKEN_HEADER)).toBe("visit-token");
    expect(headers.get(SHOPIFY_STOREFRONT_Y_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_STOREFRONT_S_HEADER)).toBe("visit-token");
  });

  it("does not apply legacy tracking tokens to document server-timing", () => {
    const context = createTestRequestContext(
      new Request("https://example.com", {
        headers: {
          cookie: "_shopify_y=unique-token; _shopify_s=visit-token",
        },
      }),
    );
    const headers = new Headers({
      "content-type": "text/html",
      "server-timing": "existing;dur=1",
    });

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toBe("existing;dur=1");
  });

  it("applies the Hydrogen powered-by header", () => {
    const context = createTestRequestContext(new Request("https://example.com"));
    const headers = new Headers();

    context.applyResponseHeaders(headers);

    expect(headers.get("powered-by")).toBe("Shopify, Hydrogen");
  });

  it("preserves user-provided Shopify state and disables caching", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "server-timing": 'db;dur=2, _y;desc="unique", app;desc="one, two", _s;desc="visit"',
    });
    headers.append("set-cookie", "_shopify_essential=updated; Path=/; Secure; HttpOnly");

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_essential=updated; Path=/; Secure; HttpOnly",
    ]);
    expect(headers.get("server-timing")).toBe(
      'db;dur=2, _y;desc="unique", app;desc="one, two", _s;desc="visit"',
    );
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("applies captured SFAPI subrequest headers for an established essential session", () => {
    const context = createTestRequestContext(
      new Request("https://example.com", {
        method: "POST",
        headers: {
          cookie: "_shopify_essential=established; _shopify_analytics=1; _shopify_marketing=1",
        },
      }),
    );
    const subrequestHeaders = new Headers({
      "server-timing": '_y;desc="collected-y", _s;desc="collected-s"',
    });
    subrequestHeaders.append("set-cookie", "_shopify_y=collected-y; Path=/; Secure");
    subrequestHeaders.append("set-cookie", "_shopify_s=collected-s; Path=/; Secure");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
    });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_y=collected-y; Path=/; Secure",
      "_shopify_s=collected-s; Path=/; Secure",
    ]);
    expect(headers.get("server-timing")).toBe('_y;desc="collected-y", _s;desc="collected-s"');
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("does not return Shopify state or disable caching for GET requests", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const subrequestHeaders = new Headers({ "server-timing": '_y;desc="unique"' });
    subrequestHeaders.append("set-cookie", "_shopify_essential=updated; Path=/; Secure; HttpOnly");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
    });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([]);
    expect(headers.get("server-timing")).toBeNull();
    expect(headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("does not apply captured SFAPI headers without an established essential session", () => {
    const context = createTestRequestContext(new Request("https://example.com/api/data"));
    const subrequestHeaders = new Headers({ "server-timing": '_y;desc="unique"' });
    subrequestHeaders.append("set-cookie", "_shopify_essential=cold; Path=/; Secure; HttpOnly");
    subrequestHeaders.append("set-cookie", "_shopify_analytics=cold; Path=/; Secure; HttpOnly");
    subrequestHeaders.append("set-cookie", "unknown_cookie=not-returned; Path=/; Secure; HttpOnly");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({ "content-type": "application/json" });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([]);
    expect(headers.get("server-timing")).toBeNull();
  });

  it("returns Shopify cookies for an established essential session", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const subrequestHeaders = new Headers();
    subrequestHeaders.append("set-cookie", "_shopify_essential=updated; Path=/; Secure; HttpOnly");
    subrequestHeaders.set("server-timing", '_y;desc="unique"');
    context.consumeStorefrontResponseHeaders(subrequestHeaders);
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
    });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_essential=updated; Path=/; Secure; HttpOnly",
    ]);
    expect(subrequestHeaders.getSetCookie()).toEqual([]);
    expect(subrequestHeaders.get("server-timing")).toBeNull();
    expect(headers.get("server-timing")).toBe('_y;desc="unique"');
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("forces no-store when returning an unrecognized captured cookie", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const subrequestHeaders = new Headers();
    subrequestHeaders.append("set-cookie", "unknown_cookie=returned; Path=/; Secure; HttpOnly");
    subrequestHeaders.append("set-cookie", "unknown_cookie=returned; Path=/; Secure; HttpOnly");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
    });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual(["unknown_cookie=returned; Path=/; Secure; HttpOnly"]);
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("forces no-store when captured state already exists on the response", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const subrequestHeaders = new Headers({ "server-timing": "shopify;dur=10" });
    subrequestHeaders.append("set-cookie", "unknown_cookie=returned; Path=/; Secure; HttpOnly");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({
      "cache-control": "public, max-age=60",
      "content-type": "application/json",
      "server-timing": "shopify;dur=10",
    });
    headers.append("set-cookie", "unknown_cookie=returned; Path=/; Secure; HttpOnly");

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual(["unknown_cookie=returned; Path=/; Secure; HttpOnly"]);
    expect(headers.get("server-timing")).toBe("shopify;dur=10");
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
  });

  it("merges captured server-timing into user timing only once", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/data", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    context.captureSubrequestHeaders(
      new Headers({ "server-timing": '_y;desc="unique", _s;desc="visit"' }),
    );
    const headers = new Headers({
      "content-type": "application/json",
      "server-timing": "app;dur=1",
    });

    context.applyResponseHeaders(headers);
    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toBe('app;dur=1, _y;desc="unique", _s;desc="visit"');

    const headersWithCapturedTimingFirst = new Headers({
      "content-type": "application/json",
      "server-timing": '_y;desc="unique", _s;desc="visit", app;dur=1',
    });

    context.applyResponseHeaders(headersWithCapturedTimingFirst);

    expect(headersWithCapturedTimingFirst.get("server-timing")).toBe(
      '_y;desc="unique", _s;desc="visit", app;dur=1',
    );
  });

  it("returns Shopify cookies for a marked consent-management request", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/unstable/graphql.json", {
        method: "POST",
        headers: { [CONSENT_MANAGEMENT_HEADER]: "1" },
      }),
    );
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "_shopify_essential=established; Path=/; Secure; HttpOnly");

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    ]);
  });

  it("returns Shopify cookies for a marked session-establishing request", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/api/ucp/mcp", { method: "POST" }),
    );
    context.markResponseAsSessionEstablishing("ucp request");
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("set-cookie", "_shopify_essential=established; Path=/; Secure; HttpOnly");

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    ]);
  });

  it("never replays captured Shopify state on document responses", () => {
    const context = createTestRequestContext(
      new Request("https://example.com", {
        headers: {
          accept: "text/html",
          cookie: "_shopify_essential=established",
        },
      }),
    );
    const subrequestHeaders = new Headers({
      "server-timing": '_y;desc="unique", _s;desc="visit"',
    });
    subrequestHeaders.append("set-cookie", "_shopify_essential=updated; Path=/; Secure; HttpOnly");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({ "content-type": "text/html" });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([]);
    expect(headers.get("server-timing")).toBeNull();
  });

  it("keeps the first captured SFAPI subrequest headers", () => {
    const context = createTestRequestContext(
      new Request("https://example.com", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    context.captureSubrequestHeaders(
      new Headers({ "server-timing": '_y;desc="first-y", _s;desc="first-s"' }),
    );
    context.captureSubrequestHeaders(
      new Headers({ "server-timing": '_y;desc="second-y", _s;desc="second-s"' }),
    );
    const headers = new Headers();

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toBe('_y;desc="first-y", _s;desc="first-s"');
  });

  it("forces no-store cache headers for personalized responses", () => {
    const context = createTestRequestContext(new Request("https://example.com/account"));
    const headers = new Headers({
      "cache-control": "public, s-maxage=600",
      "cdn-cache-control": "public, s-maxage=600",
      "cloudflare-cdn-cache-control": "public, s-maxage=600",
      "netlify-cdn-cache-control": "public, s-maxage=600",
      "surrogate-control": "max-age=600",
    });

    context.markResponseAsPersonalized("customer-account-test");
    context.applyResponseHeaders(headers);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(headers.get("cdn-cache-control")).toBeNull();
    expect(headers.get("cloudflare-cdn-cache-control")).toBeNull();
    expect(headers.get("netlify-cdn-cache-control")).toBeNull();
    expect(headers.get("surrogate-control")).toBeNull();
  });

  it("keeps cache headers for non-personalized responses", () => {
    const context = createTestRequestContext(new Request("https://example.com/products"));
    const headers = new Headers({ "cache-control": "public, s-maxage=600" });

    context.applyResponseHeaders(headers);

    expect(headers.get("cache-control")).toBe("public, s-maxage=600");
  });

  it("preserves set-cookie and server-timing when applying personalized cache safety", () => {
    const context = createTestRequestContext(
      new Request("https://example.com/account", {
        method: "POST",
        headers: { cookie: "_shopify_essential=established" },
      }),
    );
    const subrequestHeaders = new Headers({ "server-timing": "shopify;dur=10" });
    subrequestHeaders.append("set-cookie", "session=1; Path=/; Secure");
    context.captureSubrequestHeaders(subrequestHeaders);
    context.markResponseAsPersonalized("customer-account-test");
    const headers = new Headers({ "cache-control": "public, s-maxage=600" });

    context.applyResponseHeaders(headers);

    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0, must-revalidate");
    expect(headers.getSetCookie()).toEqual(["session=1; Path=/; Secure"]);
    expect(headers.get("server-timing")).toBe("shopify;dur=10");
  });
});
