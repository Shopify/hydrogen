import { describe, it, expect } from "vitest";

import {
  SFAPI_RE,
  MCP_RE,
  UCP_MCP_RE,
  BUY_PERMALINK_RE,
  isHydrogenServerHandoffPath,
  normalizeStoreDomain,
} from "./url";

describe("SFAPI_RE", () => {
  it("matches valid SFAPI paths", () => {
    expect(SFAPI_RE.test("/api/2025-01/graphql.json")).toBe(true);
    expect(SFAPI_RE.test("/api/unstable/graphql.json")).toBe(true);
    expect(SFAPI_RE.test("/api/2024-10/graphql.json")).toBe(true);
  });

  it("rejects invalid paths", () => {
    expect(SFAPI_RE.test("/api/mcp")).toBe(false);
    expect(SFAPI_RE.test("/api/graphql.json")).toBe(false);
    expect(SFAPI_RE.test("/api/20-01/graphql.json")).toBe(false);
    expect(SFAPI_RE.test("/api/2025-01/graphql.json/")).toBe(false);
    expect(SFAPI_RE.test("/api/2025-01/graphql.json?q=1")).toBe(false);
  });

  it("captures the API version", () => {
    const match = "/api/2025-01/graphql.json".match(SFAPI_RE);
    expect(match?.[1]).toBe("2025-01");
  });
});

describe("MCP_RE", () => {
  it("matches exact /api/mcp", () => {
    expect(MCP_RE.test("/api/mcp")).toBe(true);
  });

  it("rejects paths with trailing slashes or sub-paths", () => {
    expect(MCP_RE.test("/api/mcp/")).toBe(false);
    expect(MCP_RE.test("/api/mcp/foo")).toBe(false);
    expect(MCP_RE.test("/api/mcps")).toBe(false);
    expect(MCP_RE.test("/api/mc")).toBe(false);
  });
});

describe("UCP_MCP_RE", () => {
  it("matches exact /api/ucp/mcp", () => {
    expect(UCP_MCP_RE.test("/api/ucp/mcp")).toBe(true);
  });

  it.each(["/api/ucp/mcp/", "/api/ucp/mcp/foo", "/api/ucp/mcps", "/api/mcp"])(
    "does not match %s",
    (pathname) => {
      expect(UCP_MCP_RE.test(pathname)).toBe(false);
    },
  );
});

describe("BUY_PERMALINK_RE", () => {
  it.each([
    "/buy/123:1",
    "/buy/123:2,456:1",
    "/buy/sku_ab-1.2:3",
    "/buy/~Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80NTY:1",
    "/buy/123:2,~Z2lkOi8vc2hvcGlmeS9Qcm9kdWN0VmFyaWFudC80NTY:1",
  ])("matches %s", (pathname) => {
    expect(BUY_PERMALINK_RE.test(pathname)).toBe(true);
  });

  it.each([
    "/buy",
    "/buy/",
    "/buy/123",
    "/buy/123:0",
    "/buy/123:01",
    "/buy/123:1,",
    "/buy/~:1",
    "/buy/123:1/",
    "/buy/123:1/extra",
    "/en/buy/123:1",
  ])("does not match %s", (pathname) => {
    expect(BUY_PERMALINK_RE.test(pathname)).toBe(false);
  });
});

describe("isHydrogenServerHandoffPath", () => {
  it.each(["/checkout", "/cart/123:1", "/buy/123:1", "/account/login"])(
    "hands %s off to the server",
    (pathname) => {
      expect(isHydrogenServerHandoffPath(pathname)).toBe(true);
    },
  );

  it.each(["/cart", "/buy", "/account", "/products/snowboard"])(
    "keeps %s with the app",
    (pathname) => {
      expect(isHydrogenServerHandoffPath(pathname)).toBe(false);
    },
  );
});

describe("normalizeStoreDomain", () => {
  it("prepends https:// when missing", () => {
    expect(normalizeStoreDomain("my-store.myshopify.com")).toBe("https://my-store.myshopify.com");
  });

  it("preserves existing https://", () => {
    expect(normalizeStoreDomain("https://my-store.myshopify.com")).toBe(
      "https://my-store.myshopify.com",
    );
  });

  it("preserves existing http://", () => {
    expect(normalizeStoreDomain("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", () => {
    expect(normalizeStoreDomain("my-store.myshopify.com/")).toBe("https://my-store.myshopify.com");
  });

  it("throws on missing domain", () => {
    expect(() => normalizeStoreDomain(undefined as unknown as string)).toThrow(/storeDomain/);
    expect(() => normalizeStoreDomain("")).toThrow(/storeDomain/);
  });
});
