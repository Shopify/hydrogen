// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrackingValues } from "./tracking-values";

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.Shopify;
});

describe("getTrackingValues", () => {
  it.each([undefined, {}, { customerPrivacy: {} }, { customerPrivacy: { __internal: {} } }])(
    "returns empty tokens when the API is unavailable (%j)",
    (shopify) => {
      (window as any).Shopify = shopify;
      expect(getTrackingValues("hydrogen:test")).toEqual({ uniqueToken: "", visitToken: "" });
    },
  );

  it("returns empty strings for missing tokens without reusing previous values", () => {
    const uniqueToken = vi.fn<() => string | undefined>().mockReturnValue("unique");
    (window as any).Shopify = { customerPrivacy: { __internal: { uniqueToken } } };
    expect(getTrackingValues("hydrogen:test")).toEqual({ uniqueToken: "unique", visitToken: "" });

    uniqueToken.mockReturnValue(undefined);
    expect(getTrackingValues("hydrogen:test")).toEqual({ uniqueToken: "", visitToken: "" });
  });

  it("returns empty tokens outside the browser", () => {
    vi.stubGlobal("window", undefined);
    expect(getTrackingValues("hydrogen:test")).toEqual({ uniqueToken: "", visitToken: "" });
  });
});
