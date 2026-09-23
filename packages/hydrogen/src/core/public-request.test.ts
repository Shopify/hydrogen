import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { configureLogging, resetLoggingForTests } from "./logging";
import { createPublicRequest } from "./public-request";
import { createTestLogger } from "./test-utils";

const INTERNAL_URL = "http://localhost:3000/products/shirt?variant=1";
const TRUSTED = { trustForwardedHeaders: true } as const;
const UNTRUSTED = { trustForwardedHeaders: false } as const;

describe("createPublicRequest", () => {
  let logger: ReturnType<typeof createTestLogger>;

  beforeEach(() => {
    logger = createTestLogger();
    configureLogging({ logger });
  });

  afterEach(() => {
    resetLoggingForTests();
  });

  it("returns the same request when there are no forwarded headers", () => {
    const request = new Request(INTERNAL_URL);

    expect(createPublicRequest(request, TRUSTED)).toBe(request);
  });

  it("applies x-forwarded-host and x-forwarded-proto", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "shop.example", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://shop.example/products/shirt?variant=1",
    );
  });

  it("applies x-forwarded-host alone and drops the internal port", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "shop.example" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "http://shop.example/products/shirt?variant=1",
    );
  });

  it("applies x-forwarded-proto alone and keeps the request host and port", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://localhost:3000/products/shirt?variant=1",
    );
  });

  it("preserves a port in x-forwarded-host", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "local.tryhydrogen.dev:5173", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://local.tryhydrogen.dev:5173/products/shirt?variant=1",
    );
  });

  it("normalizes a default port for the forwarded scheme", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "shop.example:443", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://shop.example/products/shirt?variant=1",
    );
  });

  it("uses the first value of comma-separated forwarded headers", () => {
    const request = new Request(INTERNAL_URL, {
      headers: {
        "x-forwarded-host": " shop.example , internal-proxy:8080",
        "x-forwarded-proto": "HTTPS, http",
      },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://shop.example/products/shirt?variant=1",
    );
  });

  it("returns the same request when forwarded headers match the request URL", () => {
    const request = new Request("https://shop.example/products/shirt", {
      headers: { "x-forwarded-host": "shop.example", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED)).toBe(request);
  });

  it("applies an IPv6 x-forwarded-host", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "[::1]:5173", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED).url).toBe(
      "https://[::1]:5173/products/shirt?variant=1",
    );
  });

  it("ignores empty leading values in comma-separated forwarded headers", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": ", shop.example", "x-forwarded-proto": ", https" },
    });

    expect(createPublicRequest(request, TRUSTED)).toBe(request);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["without forwarded headers", {}, "http://localhost:3000//attacker.example/cart"],
    [
      "with forwarded headers",
      { "x-forwarded-host": "shop.example", "x-forwarded-proto": "https" },
      "https://shop.example//attacker.example/cart",
    ],
  ])("keeps the host when the path starts with // %s", (_, headers, expectedUrl) => {
    const request = new Request("http://localhost:3000//attacker.example/cart", { headers });

    const publicRequest = createPublicRequest(request, TRUSTED);

    expect(publicRequest.url).toBe(expectedUrl);
    expect(new URL(publicRequest.url).pathname).toBe("//attacker.example/cart");
  });

  it("ignores forwarded headers when they are not trusted", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, UNTRUSTED)).toBe(request);
  });

  it.each([
    ["path", "shop.example/evil"],
    ["credentials", "user@shop.example"],
    ["query", "shop.example?x=1"],
    ["invalid host", "shop example"],
  ])("ignores an x-forwarded-host containing a %s", (_, forwardedHost) => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": forwardedHost, "x-forwarded-proto": "https" },
    });

    expect(createPublicRequest(request, TRUSTED)).toBe(request);
    expect(logger.warn).toHaveBeenCalledWith("ignoring malformed x-forwarded-host value", {
      scope: "public-request",
      value: forwardedHost,
    });
  });

  it("ignores an unsupported x-forwarded-proto", () => {
    const request = new Request(INTERNAL_URL, {
      headers: { "x-forwarded-host": "shop.example", "x-forwarded-proto": "javascript" },
    });

    expect(createPublicRequest(request, TRUSTED)).toBe(request);
    expect(logger.warn).toHaveBeenCalledWith("ignoring unsupported x-forwarded-proto value", {
      scope: "public-request",
      value: "javascript",
    });
  });

  it("preserves method, headers, body, and signal", async () => {
    const controller = new AbortController();
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "cart=abc",
        origin: "https://shop.example",
        "x-forwarded-host": "shop.example",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ action: "add" }),
      signal: controller.signal,
    });

    const publicRequest = createPublicRequest(request, TRUSTED);

    expect(publicRequest).not.toBe(request);
    expect(publicRequest.url).toBe("https://shop.example/api/cart");
    expect(publicRequest.method).toBe("POST");
    expect(publicRequest.headers.get("content-type")).toBe("application/json");
    expect(publicRequest.headers.get("cookie")).toBe("cart=abc");
    expect(await publicRequest.json()).toEqual({ action: "add" });

    controller.abort();
    expect(publicRequest.signal.aborted).toBe(true);
  });

  it("preserves a streamed body", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("streamed"));
        controller.close();
      },
    });
    const request = new Request("http://localhost:3000/api/cart", {
      method: "POST",
      headers: { "x-forwarded-host": "shop.example", "x-forwarded-proto": "https" },
      body,
      duplex: "half",
    } as RequestInit);

    const publicRequest = createPublicRequest(request, TRUSTED);

    expect(await publicRequest.text()).toBe("streamed");
  });

  describe("development origin check", () => {
    it("warns when a mutation's Origin does not match the public request origin", () => {
      const request = new Request("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { origin: "https://shop.example" },
      });

      createPublicRequest(request, UNTRUSTED);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("request.url origin does not match the Origin header"),
        expect.objectContaining({
          scope: "public-request",
          origin: "https://shop.example",
          requestOrigin: "http://localhost:3000",
          trustForwardedHeaders: false,
          hint: expect.stringContaining("trustForwardedHeaders: true"),
        }),
      );
    });

    it("points at the proxy when forwarded headers are trusted but still do not match", () => {
      const request = new Request("http://localhost:3000/api/cart", {
        method: "POST",
        headers: { origin: "https://shop.example" },
      });

      createPublicRequest(request, TRUSTED);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          trustForwardedHeaders: true,
          hint: expect.stringContaining("x-forwarded-host and x-forwarded-proto"),
        }),
      );
    });

    it("does not warn once forwarded headers produce the public origin", () => {
      const request = new Request("http://localhost:3000/api/cart", {
        method: "POST",
        headers: {
          origin: "https://shop.example",
          "x-forwarded-host": "shop.example",
          "x-forwarded-proto": "https",
        },
      });

      createPublicRequest(request, TRUSTED);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it.each([
      ["GET without Origin", { method: "GET", headers: {} }],
      [
        "GET with a cross-origin Origin",
        { method: "GET", headers: { origin: "https://a.example" } },
      ],
      ["POST without Origin", { method: "POST", headers: {} }],
      ["POST with an opaque Origin", { method: "POST", headers: { origin: "null" } }],
    ])("does not warn for %s", (_, init) => {
      createPublicRequest(new Request("http://localhost:3000/api/cart", init), UNTRUSTED);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
