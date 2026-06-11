import { describe, it, expect } from "vitest";

import {
  createStorefrontRequestContext,
  extractHeaders,
  SHOPIFY_STOREFRONT_S_HEADER,
  SHOPIFY_STOREFRONT_Y_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
  REQUEST_GROUP_ID_HEADER,
} from "./headers";

describe("extractHeaders", () => {
  it("extracts present headers and skips missing ones", () => {
    const headers = new Map([
      ["content-type", "application/json"],
      ["accept", "text/html"],
    ]);

    const result = extractHeaders(
      (key) => headers.get(key) ?? null,
      ["content-type", "accept", "x-missing-header"],
    );

    expect(result).toEqual([
      ["content-type", "application/json"],
      ["accept", "text/html"],
    ]);
  });

  it("returns empty array when no headers match", () => {
    const result = extractHeaders(() => null, ["a", "b", "c"]);
    expect(result).toEqual([]);
  });

  it("returns [key, value] tuples", () => {
    const result = extractHeaders((key) => (key === "x-test" ? "value" : null), ["x-test"]);

    expect(result).toEqual([["x-test", "value"]]);
  });
});

describe("createStorefrontRequestContext", () => {
  it("creates stable tracking tokens from a request", () => {
    const request = new Request("https://example.com/products/snowboard");

    const result = createStorefrontRequestContext(request);

    expect(result.url).toBe("https://example.com/products/snowboard");
    expect(result.requestGroupId).toBeTruthy();
    expect(result.uniqueToken).toBeTruthy();
    expect(result.visitToken).toBeTruthy();
  });

  it("keeps a reference to the request signal", () => {
    const controller = new AbortController();
    const request = new Request("https://example.com/products/snowboard", {
      signal: controller.signal,
    });

    const result = createStorefrontRequestContext(request);

    expect(result.signal).toBe(request.signal);
    controller.abort();
    expect(result.signal?.aborted).toBe(true);
  });

  it("uses the forwarded storefront URL header when input has no URL", () => {
    const result = createStorefrontRequestContext({
      headers: new Headers({ "x-storefront-url": "https://example.com/products/snowboard" }),
    });

    expect(result.url).toBe("https://example.com/products/snowboard");
  });

  it("does not create fallback tokens when modern Shopify analytics cookies are present", () => {
    const result = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { cookie: "_shopify_analytics=1; _shopify_marketing=1" },
      }),
    );

    expect(result.cookie).toBe("_shopify_analytics=1; _shopify_marketing=1");
    expect(result.uniqueToken).toBeUndefined();
    expect(result.visitToken).toBeUndefined();
  });

  it("reuses legacy Shopify tracking cookies when present", () => {
    const result = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { cookie: "_shopify_y=unique-token; _shopify_s=visit-token" },
      }),
    );

    expect(result.uniqueToken).toBe("unique-token");
    expect(result.visitToken).toBe("visit-token");
    expect(result.legacyTokens).toBe(true);
  });

  it("does not reuse legacy Shopify tracking cookies when modern analytics cookies are present", () => {
    const result = createStorefrontRequestContext(
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
    const result = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { "x-request-id": "incoming-request-id" },
      }),
    );

    expect(result.requestGroupId).toBe("incoming-request-id");
  });

  it("falls back to request-id for the default request group id", () => {
    const result = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { "request-id": "incoming-request-id" },
      }),
    );

    expect(result.requestGroupId).toBe("incoming-request-id");
  });

  it("reuses tracking tokens forwarded in request headers", () => {
    const result = createStorefrontRequestContext(
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
    const context = createStorefrontRequestContext(
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
    expect(headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_VISIT_TOKEN_HEADER)).toBe("visit-token");
    expect(headers.get(SHOPIFY_STOREFRONT_Y_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_STOREFRONT_S_HEADER)).toBe("visit-token");
  });

  it("does not mutate the original request headers when getting forwarded request headers", () => {
    const originalHeaders = new Headers({ accept: "text/html" });
    const context = createStorefrontRequestContext({
      headers: originalHeaders,
      url: "https://example.com",
    });

    const headers = context.getForwardedRequestHeaders();

    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBeTruthy();
    expect(originalHeaders.get(REQUEST_GROUP_ID_HEADER)).toBeNull();
  });

  it("gets subrequest headers from only storefront context", () => {
    const context = createStorefrontRequestContext(
      new Request("https://example.com/products/snowboard", {
        headers: {
          accept: "text/html",
          cookie: "_shopify_y=unique-token; _shopify_s=visit-token",
          "x-random": "not-forwarded",
          "x-request-id": "incoming-request-id",
        },
      }),
    );

    const headers = context.getSubrequestHeaders();

    expect(headers.get("accept")).toBeNull();
    expect(headers.get("x-random")).toBeNull();
    expect(headers.get("x-storefront-url")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-shopify-storefront-access-token")).toBeNull();
    expect(headers.get("cookie")).toBe("_shopify_y=unique-token; _shopify_s=visit-token");
    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBe("incoming-request-id");
    expect(headers.get(SHOPIFY_UNIQUE_TOKEN_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_VISIT_TOKEN_HEADER)).toBe("visit-token");
    expect(headers.get(SHOPIFY_STOREFRONT_Y_HEADER)).toBe("unique-token");
    expect(headers.get(SHOPIFY_STOREFRONT_S_HEADER)).toBe("visit-token");
  });

  it("gets mutable subrequest headers", () => {
    const context = createStorefrontRequestContext(new Request("https://example.com"));

    const headers = context.getSubrequestHeaders();
    headers.set("content-type", "application/json");

    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBeTruthy();
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("applies tracking tokens as server-timing", () => {
    const context = createStorefrontRequestContext(
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

    expect(headers.get("server-timing")).toBe(
      "existing;dur=1, _y;desc=unique-token, _s;desc=visit-token",
    );
  });

  it("applies generated tracking tokens as server-timing when cookies are missing", () => {
    const context = createStorefrontRequestContext(new Request("https://example.com"));
    const headers = new Headers({ "content-type": "text/html" });

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toMatch(/^_y;desc=[0-9a-f-]+, _s;desc=[0-9a-f-]+$/);
  });

  it("applies generated tracking tokens from a document request before response content-type is known", () => {
    const context = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { "sec-fetch-dest": "document" },
      }),
    );
    const headers = new Headers();

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toMatch(/^_y;desc=[0-9a-f-]+, _s;desc=[0-9a-f-]+$/);
  });

  it("does not use accept text/html as a document signal for non-GET requests", () => {
    const context = createStorefrontRequestContext(
      new Request("https://example.com/api", {
        method: "POST",
        headers: { accept: "text/html" },
      }),
    );
    const headers = new Headers();

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toBeNull();
  });

  it("does not apply fallback tracking tokens to non-document responses", () => {
    const context = createStorefrontRequestContext(new Request("https://example.com/__manifest"));
    const headers = new Headers();

    context.applyResponseHeaders(headers);

    expect(headers.get("server-timing")).toBeNull();
  });

  it("applies captured SFAPI subrequest cookies and server-timing", () => {
    const context = createStorefrontRequestContext(
      new Request("https://example.com", {
        headers: { cookie: "_shopify_analytics=1; _shopify_marketing=1" },
      }),
    );
    const subrequestHeaders = new Headers({
      "server-timing": '_y;desc="collected-y", _s;desc="collected-s"',
    });
    subrequestHeaders.append("set-cookie", "_shopify_y=collected-y; Path=/; Secure");
    subrequestHeaders.append("set-cookie", "_shopify_s=collected-s; Path=/; Secure");
    context.captureSubrequestHeaders(subrequestHeaders);
    const headers = new Headers({ "content-type": "text/html" });

    context.applyResponseHeaders(headers);

    expect(headers.getSetCookie()).toEqual([
      "_shopify_y=collected-y; Path=/; Secure",
      "_shopify_s=collected-s; Path=/; Secure",
    ]);
    expect(headers.get("server-timing")).toBe('_y;desc="collected-y", _s;desc="collected-s"');
  });

  it("keeps the first captured SFAPI subrequest headers", () => {
    const context = createStorefrontRequestContext(new Request("https://example.com"));
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
});
