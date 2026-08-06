import { describe, it, expect, vi, beforeEach } from "vitest";

import { createShopifyRequestContext, SHOPIFY_CHAT_FRAME_ORIGIN_HEADER } from "../../headers";
import { assert } from "../../test-utils";
import { handleAgentProxy as handleAgentProxyImpl } from "./agent-proxy";

const defaultStoreUrl = "https://test-store.myshopify.com";

function createRequest(path: string, origin = "https://headless.example"): Request {
  return new Request(`${origin}${path}`);
}

function handleAgentProxy(request: Request, storeUrl = defaultStoreUrl) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  return handleAgentProxyImpl(new URL(request.url), {
    request,
    requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient: {
      type: "private",
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

function createTestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin() {
      return origin;
    },
    getSessionItem(key: string) {
      return data.get(key);
    },
    setSessionItem(key: string, value: unknown) {
      data.set(key, value);
    },
    removeSessionItem(key: string) {
      data.delete(key);
    },
    commit() {
      return new Headers({ "set-cookie": `session=abc; Path=/; Domain=${origin}` });
    },
  };
}

describe("handleAgentProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response("", { status: 302 }));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null for non-agent URLs", async () => {
    const result = await handleAgentProxy(createRequest("/products"));

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not intercept other /agent/ paths so app routes are not shadowed", async () => {
    for (const path of [
      "/agent",
      "/agent/",
      "/agent/chat",
      "/agent/handoff/extra",
      "/agent/buyer-claims/extra",
      "/agent/handoffs",
    ]) {
      const result = await handleAgentProxy(createRequest(path));
      expect(result, `expected ${path} not to be proxied`).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards locale-prefixed and format-suffixed agent paths", async () => {
    for (const path of [
      "/agent/handoff/",
      "/agent/handoff.json",
      "/en-us/agent/handoff",
      "/agent/buyer-claims/",
      "/agent/buyer-claims.json",
      "/en-us/agent/buyer-claims",
    ]) {
      mockFetch.mockClear();
      await handleAgentProxy(createRequest(path));
      expect(mockFetch, `expected ${path} to be proxied`).toHaveBeenCalledTimes(1);
    }
  });

  it("forwards agent requests to the Online Store origin", async () => {
    for (const path of ["/agent/handoff?expanded=1", "/agent/buyer-claims?expanded=1"]) {
      mockFetch.mockClear();
      await handleAgentProxy(createRequest(path));

      const call = mockFetch.mock.calls[0];
      assert(call, "expected fetch to be called");
      const [url] = call;
      expect(url.href).toBe(`https://test-store.myshopify.com${path}`);
    }
  });

  it("forwards the embedding parent origin through a browser-forbidden Sec header", async () => {
    await handleAgentProxy(createRequest("/agent/handoff", "https://headless.example"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER)).toBe("https://headless.example");
  });

  it("forwards explicit-port loopback origins for local development", async () => {
    await handleAgentProxy(createRequest("/agent/handoff", "http://localhost:3000"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER)).toBe("http://localhost:3000");
  });

  it("does not allow incoming headers to override the request origin", async () => {
    const request = new Request("https://headless.example/agent/handoff", {
      headers: {
        [SHOPIFY_CHAT_FRAME_ORIGIN_HEADER]: "https://attacker.example",
      },
    });

    await handleAgentProxy(request);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(SHOPIFY_CHAT_FRAME_ORIGIN_HEADER)).toBe("https://headless.example");
  });
});
