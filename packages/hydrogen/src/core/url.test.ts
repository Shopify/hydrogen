import { describe, it, expect } from "vitest";

import { SFAPI_RE, MCP_RE, normalizeStoreDomain } from "./url";

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
