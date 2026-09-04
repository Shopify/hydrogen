// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CONSENT_TRACKING_API_LOADED_EVENT, VISITOR_CONSENT_COLLECTED_EVENT } from "./constants";

const { getTrackingValuesMock } = vi.hoisted(() => ({
  getTrackingValuesMock: vi.fn(() => ({
    uniqueToken: "abc-unique-token",
    visitToken: "def-visit-token",
    consent: null,
  })),
}));

vi.mock("./utils/tracking-values", () => ({
  getTrackingValues: getTrackingValuesMock,
}));

vi.mock("./utils/uuid", () => ({
  buildUUID: vi.fn(() => "mock-uuid"),
}));

async function loadDeprecatedCookies() {
  return import("./deprecated-cookies");
}

function setAnalyticsConsent(allowed: boolean) {
  window.Shopify = {
    ...window.Shopify,
    customerPrivacy: {
      ...window.Shopify?.customerPrivacy,
      analyticsProcessingAllowed: () => allowed,
    },
  } as typeof window.Shopify;
}

describe("deprecated-cookies", () => {
  let cookieJar: string;
  let documentListeners: Map<string, EventListener[]>;

  beforeEach(() => {
    vi.resetModules();
    getTrackingValuesMock.mockReset();
    getTrackingValuesMock.mockReturnValue({
      uniqueToken: "abc-unique-token",
      visitToken: "def-visit-token",
      consent: null,
    });

    documentListeners = new Map();

    vi.spyOn(document, "addEventListener").mockImplementation((type, listener) => {
      const eventName = String(type);
      const listeners = documentListeners.get(eventName) ?? [];
      listeners.push(listener as EventListener);
      documentListeners.set(eventName, listeners);
    });

    delete window.Shopify;
    cookieJar = "";
    Object.defineProperty(document, "cookie", {
      get: () => cookieJar,
      set: (value: string) => {
        cookieJar += (cookieJar ? "; " : "") + value;
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function triggerDocumentListener(eventName: string) {
    for (const listener of documentListeners.get(eventName) ?? []) {
      listener(new CustomEvent(eventName));
    }
  }

  describe("computeCookieDomain", () => {
    it("returns empty string for localhost", async () => {
      const { computeCookieDomain } = await loadDeprecatedCookies();

      expect(computeCookieDomain("localhost")).toBe("");
    });

    it("uses the consent domain when provided", async () => {
      const { computeCookieDomain } = await loadDeprecatedCookies();

      expect(computeCookieDomain("https://localhost:3000/path")).toBe("");
    });
  });

  describe("initializeDeprecatedCookies", () => {
    it("sets cookies on page view when tracking allowed", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);
      const subscribe = vi.fn((_eventName: string, callback: () => void) => {
        callback();
        return vi.fn();
      });
      window.Shopify = {
        ...window.Shopify,
        analytics: { subscribe },
      } as unknown as typeof window.Shopify;

      initializeDeprecatedCookies();

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("does not set cookies on page view when tracking is not allowed", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(false);
      const subscribe = vi.fn((_eventName: string, callback: () => void) => {
        callback();
        return vi.fn();
      });
      window.Shopify = {
        ...window.Shopify,
        analytics: { subscribe },
      } as unknown as typeof window.Shopify;

      initializeDeprecatedCookies();

      expect(cookieJar).toBe("");
    });

    it("sets cookies when visitor consent is collected and tracking is allowed", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);

      initializeDeprecatedCookies();
      triggerDocumentListener(VISITOR_CONSENT_COLLECTED_EVENT);

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("sets cookies when initial consent becomes ready and tracking is allowed", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);

      initializeDeprecatedCookies();
      triggerDocumentListener(CONSENT_TRACKING_API_LOADED_EVENT);

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("computes the cookie domain from the Shopify consent config", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);
      window.Shopify = {
        ...window.Shopify,
        customerPrivacy: {
          ...window.Shopify?.customerPrivacy,
          config: { consentDomain: "checkout.hydrogen.shop" },
        },
      } as typeof window.Shopify;

      initializeDeprecatedCookies();
      triggerDocumentListener(VISITOR_CONSENT_COLLECTED_EVENT);

      expect(cookieJar).toContain("domain=.hydrogen.shop");
    });

    it("sets cookies immediately when consent already loaded and tracking is allowed", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);
      window.Shopify = {
        ...window.Shopify,
        customerPrivacy: {
          ...window.Shopify?.customerPrivacy,
          consentStatus: "loaded",
        },
      } as typeof window.Shopify;

      initializeDeprecatedCookies();

      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("removes cookies when visitor consent is collected without tracking consent", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(false);

      initializeDeprecatedCookies();
      triggerDocumentListener(VISITOR_CONSENT_COLLECTED_EVENT);

      expect(cookieJar).toContain("_shopify_y=;");
      expect(cookieJar).toContain("max-age=0");
    });

    it("skips setting cookies when tracking values start with 00000000-", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      getTrackingValuesMock.mockReturnValueOnce({
        uniqueToken: "00000000-0000-0000-0000-000000000000",
        visitToken: "00000000-0000-0000-0000-000000000000",
        consent: null,
      });

      setAnalyticsConsent(true);

      initializeDeprecatedCookies();
      triggerDocumentListener(VISITOR_CONSENT_COLLECTED_EVENT);

      expect(cookieJar).toBe("");
    });

    it("syncs page-view cookies when the analytics bus already exists", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      setAnalyticsConsent(true);
      const unsubscribe = vi.fn();
      const subscribe = vi.fn((_eventName: string, _callback: () => void) => unsubscribe);
      window.Shopify = {
        ...window.Shopify,
        analytics: { subscribe },
      } as unknown as typeof window.Shopify;

      initializeDeprecatedCookies();

      const [eventName, callback] = subscribe.mock.calls[0];
      expect(eventName).toBe("page_viewed");

      callback();
      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });

    it("syncs page-view cookies when the analytics bus is available by DOMContentLoaded", async () => {
      const { initializeDeprecatedCookies } = await loadDeprecatedCookies();

      Object.defineProperty(document, "readyState", {
        configurable: true,
        value: "loading",
      });
      setAnalyticsConsent(true);
      const unsubscribe = vi.fn();
      const subscribe = vi.fn((_eventName: string, _callback: () => void) => unsubscribe);

      initializeDeprecatedCookies();

      expect(subscribe).not.toHaveBeenCalled();

      window.Shopify = {
        ...window.Shopify,
        analytics: { subscribe },
      } as unknown as typeof window.Shopify;
      triggerDocumentListener("DOMContentLoaded");

      const [eventName, callback] = subscribe.mock.calls[0];
      expect(eventName).toBe("page_viewed");

      callback();
      expect(cookieJar).toContain("_shopify_y=");
      expect(cookieJar).toContain("_shopify_s=");
    });
  });
});
