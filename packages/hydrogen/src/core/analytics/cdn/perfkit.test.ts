// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AnalyticsEvent } from "../events";
import type { ShopAnalytics } from "../types";
import { createPerfKitProcessor } from "./perfkit";

const { loadScriptMock } = vi.hoisted(() => ({
  loadScriptMock: vi.fn((_url: string, _attributes?: Record<string, string>) => Promise.resolve()),
}));

vi.mock("../../utils/load-script", () => ({
  loadScript: loadScriptMock,
}));

const TEST_SHOP: ShopAnalytics = {
  shopId: "gid://shopify/Shop/42",
  acceptedLanguage: "en",
  currency: "USD",
  hydrogenSubchannelId: "sub-1",
};

describe("createPerfKitProcessor", () => {
  beforeEach(() => {
    loadScriptMock.mockClear();
    window.PerfKit = {
      navigate: vi.fn(),
      setPageType: vi.fn(),
    };
  });

  it("does not load the PerfKit script until startLoading", () => {
    const perfkit = createPerfKitProcessor(() => ({ shop: TEST_SHOP, consent: {} as any }));

    perfkit.handleEvent(AnalyticsEvent.PAGE_VIEWED, { url: "/" });

    expect(loadScriptMock).not.toHaveBeenCalled();
    expect(window.PerfKit?.navigate).not.toHaveBeenCalled();
  });

  it("loads the script once on startLoading and replays queued events", async () => {
    const perfkit = createPerfKitProcessor(() => ({ shop: TEST_SHOP, consent: {} as any }));

    perfkit.handleEvent(AnalyticsEvent.PAGE_VIEWED, { url: "/" });
    perfkit.startLoading();

    expect(loadScriptMock).toHaveBeenCalledOnce();

    await vi.waitFor(() => {
      expect(window.PerfKit?.navigate).toHaveBeenCalledOnce();
    });

    perfkit.startLoading();
    expect(loadScriptMock).toHaveBeenCalledOnce();
  });

  it("skips loading when shop config is missing", () => {
    const perfkit = createPerfKitProcessor(() => ({ shop: null, consent: {} as any }));

    perfkit.startLoading();

    expect(loadScriptMock).not.toHaveBeenCalled();
  });

  it("uses the latest shop config when loading", () => {
    let shop: ShopAnalytics | null = null;
    const perfkit = createPerfKitProcessor(() => ({ shop, consent: {} as any }));

    perfkit.startLoading();
    expect(loadScriptMock).not.toHaveBeenCalled();

    shop = TEST_SHOP;
    perfkit.startLoading();

    expect(loadScriptMock).toHaveBeenCalledOnce();
  });
});
