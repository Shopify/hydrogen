import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrivateStorefrontClient } from "../../client";
import { assert } from "../test-utils";
import { handleGraphiql } from "./graphiql";

const storefrontClient = {
  type: "private",
  storeUrl: "https://test-store.myshopify.com",
  apiUrl: "https://test-store.myshopify.com/api/2026-04/graphql.json",
  graphql: vi.fn(),
} satisfies PrivateStorefrontClient;

describe("handleGraphiql", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}))));
  });

  it("serves HTML for GET /graphiql", async () => {
    const request = new Request("https://my-app.com/graphiql", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient);

    assert(result, "expected graphiql response");
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("text/html");
  });

  it("includes SFAPI config in the response HTML", async () => {
    const request = new Request("https://my-app.com/graphiql", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient);
    assert(result, "expected graphiql response");
    const html = await result.text();

    expect(html).toContain("test-store.myshopify.com");
    expect(html).not.toContain("test-token");
    expect(html).toContain("unstable");
    expect(html).toContain("Storefront API");
  });

  it("returns null for non-GET requests", async () => {
    const request = new Request("https://my-app.com/graphiql", {
      method: "POST",
    });

    const result = await handleGraphiql(request, storefrontClient);
    expect(result).toBeNull();
  });

  it("returns null for non-matching paths", async () => {
    const request = new Request("https://my-app.com/other", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient);
    expect(result).toBeNull();
  });

  it("includes CAAPI tab when customerAccount is provided", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ __schema: { types: [] } })));
    vi.stubGlobal("fetch", mockFetch);

    const request = new Request("https://my-app.com/graphiql", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient, {
      customerAccount: {
        apiUrl: "https://ca-api.shopify.com",
        accessToken: "ca-token",
        schemaUrl: "https://my-app.com/graphiql/customer-account.schema.json",
      },
    });

    assert(result, "expected graphiql response with CAAPI tab");
    const html = await result.text();
    expect(html).toContain("Customer Account API");
    expect(html).toContain("ca-api.shopify.com");
  });

  it("escapes HTML-unsafe characters in schema JSON to prevent XSS", async () => {
    const maliciousSchema = {
      __schema: { description: "</script><script>alert(1)</script>" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(maliciousSchema))),
    );

    const request = new Request("https://my-app.com/graphiql", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient, {
      customerAccount: {
        apiUrl: "https://ca-api.shopify.com",
        accessToken: "ca-token",
        schemaUrl: "https://my-app.com/schema.json",
      },
    });

    assert(result, "expected graphiql response");
    const html = await result.text();
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });

  it("gracefully handles CAAPI schema fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Network error")));

    const request = new Request("https://my-app.com/graphiql", {
      method: "GET",
    });

    const result = await handleGraphiql(request, storefrontClient, {
      customerAccount: {
        apiUrl: "https://ca-api.shopify.com",
        accessToken: "ca-token",
        schemaUrl: "https://my-app.com/schema.json",
      },
    });

    assert(result, "expected graphiql response even on schema fetch failure");
    const html = await result.text();
    expect(html).not.toContain("Customer Account API");
  });
});
