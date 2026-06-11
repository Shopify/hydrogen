// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { initDeprecatedCookies, computeCookieDomain } from "./deprecated-cookies";
import { getTrackingValues } from "./utils/tracking-values";

vi.mock("./utils/tracking-values", () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: "abc-unique-token",
    visitToken: "def-visit-token",
    consent: null,
  })),
}));

vi.mock("./utils/uuid", () => ({
  buildUUID: vi.fn(() => "mock-uuid"),
}));

const getTrackingValuesMock = vi.mocked(getTrackingValues);

function createMockDeps(overrides = {}) {
  const deps = {
    canTrack: () => true,
    consentDomain: "checkout.hydrogen.shop",
    cookieDomain: "",
    ...overrides,
  };

  return {
    deps,
  };
}

describe("deprecated-cookies", () => {
  let cookieJar: string;

  beforeEach(() => {
    cookieJar = "";
    Object.defineProperty(document, "cookie", {
      get: () => cookieJar,
      set: (value: string) => {
        cookieJar += (cookieJar ? "; " : "") + value;
      },
      configurable: true,
    });
  });

  describe("computeCookieDomain", () => {
    it("returns empty string for localhost", () => {
      expect(computeCookieDomain("localhost")).toBe("");
    });

    it("uses override domain when provided", () => {
      const result = computeCookieDomain("checkout.hydrogen.shop", "localhost");
      expect(result).toBe("");
    });
  });

  describe("initDeprecatedCookies", () => {
    it("sets cookies on page view sync when tracking allowed", () => {
      const { deps } = createMockDeps();
      const controller = initDeprecatedCookies(deps);

      controller.syncPageView();

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("does not set cookies when tracking is not allowed", () => {
      const { deps } = createMockDeps({ canTrack: () => false });
      const controller = initDeprecatedCookies(deps);

      controller.syncPageView();

      expect(cookieJar).toBe("");
    });

    it("sets cookies when synced and canTrack is true", () => {
      const { deps } = createMockDeps({ canTrack: () => true });
      const controller = initDeprecatedCookies(deps);

      controller.sync();

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("removes cookies when canTrack returns false", () => {
      const { deps } = createMockDeps({ canTrack: () => false });
      const controller = initDeprecatedCookies(deps);

      controller.sync();

      expect(cookieJar).toContain("_shopify_y=;");
      expect(cookieJar).toContain("max-age=0");
    });

    it("skips setting cookies when tracking values start with 00000000-", () => {
      getTrackingValuesMock.mockReturnValueOnce({
        uniqueToken: "00000000-0000-0000-0000-000000000000",
        visitToken: "00000000-0000-0000-0000-000000000000",
        consent: "",
      });

      const { deps } = createMockDeps();
      const controller = initDeprecatedCookies(deps);

      controller.sync();

      expect(cookieJar).toBe("");
    });
  });
});
