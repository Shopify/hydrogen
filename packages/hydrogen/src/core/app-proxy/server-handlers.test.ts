import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createShopifyRequestContext } from "../request-context";
import { handleShopifyRoutes } from "../request-routing/handle-shopify-routes";
import type { HydrogenRoutesOptions } from "../request-routing/route-types";
import { assert } from "../test-utils";
import { createAppProxyServerHandlers } from "./server-handlers";

const STORE_URL = "https://test-store.myshopify.com";
const APP_ORIGIN = "https://headless.example";

function createTestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;
  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

function handle(request: Request, handlers: HydrogenRoutesOptions["handlers"] = []) {
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext: createShopifyRequestContext({
      request,
      i18n: { country: "US", language: "EN" },
    }),
    config: { storeDomain: STORE_URL },
  });
  return handleShopifyRoutes({
    request,
    requestContext: storefrontClient.requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
    handlers,
  });
}

function fetchCall(mockFetch: ReturnType<typeof vi.fn>) {
  const call = mockFetch.mock.calls[0];
  assert(call, "expected fetch to be called");
  return { url: call[0] as URL, init: call[1] as RequestInit };
}

describe("createAppProxyServerHandlers", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("exposes one wildcard, any-method handler per prefix", () => {
    const handlers = createAppProxyServerHandlers();

    expect(Object.keys(handlers)).toEqual(["apps", "a", "community", "tools"]);
    assert(handlers.a, "expected a handler for /a");
    expect(handlers.a.pathname).toBe("/a/*");
    expect(handlers.a.method).toBe("*");

    const narrowed = createAppProxyServerHandlers({ prefixes: ["a"] });
    expect(Object.keys(narrowed)).toEqual(["a"]);
  });

  it("rejects unknown prefixes at creation", () => {
    expect(() => createAppProxyServerHandlers({ prefixes: ["widgets" as never] })).toThrow(
      'createAppProxyServerHandlers: "widgets" is not a Shopify app proxy prefix',
    );
  });

  it("does nothing when the group is not registered", () => {
    expect(handle(new Request(`${APP_ORIGIN}/a/downloads/-/grant/token`))).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proxies every Shopify app proxy prefix with _fd=0 and passes the response through", async () => {
    const handlers = [createAppProxyServerHandlers()];

    for (const prefix of ["apps", "a", "community", "tools"]) {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce(
        new Response('<div id="digital-downloads-proxy"></div>', {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "content-disposition": 'inline; filename="guide.pdf"',
            "x-app-header": "kept",
          },
        }),
      );

      const result = await handle(
        new Request(`${APP_ORIGIN}/${prefix}/downloads/-/grant/token?download=guide.pdf`, {
          headers: { "user-agent": "Mozilla/5.0", accept: "text/html", host: "headless.example" },
        }),
        handlers,
      );

      assert(result, `expected a response for /${prefix}`);
      const { url, init } = fetchCall(mockFetch);
      expect(url.href).toBe(
        `${STORE_URL}/${prefix}/downloads/-/grant/token?download=guide.pdf&_fd=0`,
      );
      expect(init.redirect).toBe("manual");
      const headers = new Headers(init.headers);
      expect(headers.get("user-agent")).toBe("Mozilla/5.0");
      expect(headers.get("accept")).toBe("text/html");
      expect(headers.get("host")).toBeNull();
      expect(result.status).toBe(200);
      expect(result.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(result.headers.get("content-disposition")).toBe('inline; filename="guide.pdf"');
      expect(result.headers.get("x-app-header")).toBe("kept");
      await expect(result.text()).resolves.toBe('<div id="digital-downloads-proxy"></div>');
    }
  });

  it("proxies the bare prefix path and every HTTP method", async () => {
    mockFetch.mockResolvedValue(new Response("ok"));
    const handlers = [createAppProxyServerHandlers({ prefixes: ["a"] })];

    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const result = await handle(new Request(`${APP_ORIGIN}/a`, { method }), handlers);
      expect(result?.status, method).toBe(200);
    }
    expect(mockFetch).toHaveBeenCalledTimes(7);
  });

  it("does not proxy paths outside the prefixes, or prefix look-alikes", () => {
    const handlers = [createAppProxyServerHandlers()];

    for (const pathname of ["/apple", "/about", "/a-b", "/products/a", "/tooling"]) {
      expect(handle(new Request(`${APP_ORIGIN}${pathname}`), handlers), pathname).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("limits proxying to the configured prefixes", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok"));
    const handlers = [createAppProxyServerHandlers({ prefixes: ["a"] })];

    expect(handle(new Request(`${APP_ORIGIN}/apps/reviews`), handlers)).toBeNull();
    const result = await handle(new Request(`${APP_ORIGIN}/a/reviews`), handlers);

    assert(result, "expected a proxied response");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("forwards POST bodies for app forms and endpoints", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"ok":true}', { headers: { "content-type": "application/json" } }),
    );

    const result = await handle(
      new Request(`${APP_ORIGIN}/apps/reviews/submit`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "rating=5",
      }),
      [createAppProxyServerHandlers()],
    );

    assert(result, "expected a proxied response");
    const { init } = fetchCall(mockFetch);
    expect(init.method).toBe("POST");
    expect(init.body).toBeTruthy();
    await expect(result.json()).resolves.toEqual({ ok: true });
  });

  it("passes external redirects through untouched", async () => {
    const signedUrl = "https://storage.googleapis.com/bucket/guide.pdf?X-Goog-Signature=abc";
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: signedUrl } }),
    );

    const result = await handle(new Request(`${APP_ORIGIN}/a/downloads/-/grant/token/download`), [
      createAppProxyServerHandlers(),
    ]);

    assert(result, "expected a proxied response");
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(signedUrl);
  });

  it("rewrites redirects that point back at the store origin onto the storefront", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: `${STORE_URL}/a/downloads/-/grant/token?_fd=0&page=2#top` },
      }),
    );

    const result = await handle(new Request(`${APP_ORIGIN}/a/downloads/-/grant/token`), [
      createAppProxyServerHandlers(),
    ]);

    assert(result, "expected a proxied response");
    expect(result.headers.get("location")).toBe(
      `${APP_ORIGIN}/a/downloads/-/grant/token?page=2#top`,
    );
  });

  it("resolves relative redirects against the storefront origin", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 303, headers: { location: "/apps/reviews/thanks" } }),
    );

    const result = await handle(new Request(`${APP_ORIGIN}/apps/reviews/submit`), [
      createAppProxyServerHandlers(),
    ]);

    assert(result, "expected a proxied response");
    expect(result.headers.get("location")).toBe(`${APP_ORIGIN}/apps/reviews/thanks`);
  });

  it("lets a handler at a literal pathname win over the proxy", async () => {
    mockFetch.mockResolvedValueOnce(new Response("proxied"));
    const custom = Object.assign(async () => ({ type: "json" as const, data: "handled" }), {
      pathname: "/a/custom",
      method: "GET",
    });

    const result = await handle(new Request(`${APP_ORIGIN}/a/custom`), [
      createAppProxyServerHandlers(),
      { custom },
    ]);

    await expect(result?.json()).resolves.toBe("handled");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns an uncached 502 when the store is unreachable", async () => {
    mockFetch.mockRejectedValueOnce(new Error("upstream down"));

    const result = await handle(new Request(`${APP_ORIGIN}/a/downloads`), [
      createAppProxyServerHandlers(),
    ]);

    assert(result, "expected an error response");
    expect(result.status).toBe(502);
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
});
