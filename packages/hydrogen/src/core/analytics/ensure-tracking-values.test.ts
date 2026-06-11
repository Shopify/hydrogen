// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ensureTrackingValues } from "./ensure-tracking-values";

vi.mock("./utils/tracking-values", () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: "test-unique",
    visitToken: "test-visit",
    consent: null,
  })),
}));

describe("ensureTrackingValues", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "http://localhost:3000/");
  });

  it("fetches from same-origin SFAPI proxy when consentDomain is the current host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues(window.location.host, "public-token-123456789012345678");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/unstable/graphql.json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Shopify-Storefront-Access-Token": "public-token-123456789012345678",
          "X-Shopify-VisitToken": "test-visit",
          "X-Shopify-UniqueToken": "test-unique",
        }),
      }),
    );
  });

  it("fetches from consentDomain when it is not the current host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues("store.test.shop", "public-token-123456789012345678");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://store.test.shop/api/unstable/graphql.json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Shopify-Storefront-Access-Token": "public-token-123456789012345678",
          "X-Shopify-VisitToken": "test-visit",
          "X-Shopify-UniqueToken": "test-unique",
        }),
      }),
    );
  });

  it("normalizes consentDomain before building the request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues("https://store.test.shop/some/path/");

    expect(fetchSpy.mock.calls[0][0]).toBe("https://store.test.shop/api/unstable/graphql.json");
  });

  it("throws when consentDomain is not a valid host or URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));

    await expect(ensureTrackingValues("http://[invalid-host]")).rejects.toThrow(TypeError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses same-origin SFAPI proxy when consentDomain is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues("");

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/unstable/graphql.json");
  });

  it("omits the Storefront API token header when token is omitted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues(window.location.host);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/unstable/graphql.json",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "X-Shopify-Storefront-Access-Token": expect.any(String),
        }),
      }),
    );
  });

  it("omits the Storefront API token header when token is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { consentManagement: { cookies: { cookieDomain: ".test.shop" } } },
        }),
      ),
    );

    await ensureTrackingValues(window.location.host, "");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/unstable/graphql.json",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "X-Shopify-Storefront-Access-Token": expect.any(String),
        }),
      }),
    );
  });

  it("does not retry after a failed request", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    await ensureTrackingValues("store.test.shop", "public-token-123456789012345678");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://store.test.shop/api/unstable/graphql.json");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch tracking values"),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });

  it("does not retry with an absolute URL when consentDomain is empty", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("same-origin failed"));

    await ensureTrackingValues("", "public-token-123456789012345678");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/unstable/graphql.json");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch tracking values"),
      "same-origin failed",
    );
    warnSpy.mockRestore();
  });

  it("does not throw when the request fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    await expect(
      ensureTrackingValues("store.test.shop", "public-token-123456789012345678"),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch tracking values"),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});
