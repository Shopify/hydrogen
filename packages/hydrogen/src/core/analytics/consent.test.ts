// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { loadScript } from "../utils/load-script";
import { CONSENT_API, CONSENT_API_WITH_BANNER, initConsent } from "./consent";
import { ensureTrackingValues } from "./ensure-tracking-values";
import { getTrackingValues } from "./utils/tracking-values";

vi.mock("../utils/load-script", () => ({
  loadScript: vi.fn(() => Promise.resolve()),
}));

vi.mock("./ensure-tracking-values", () => ({
  ensureTrackingValues: vi.fn(() => Promise.resolve()),
}));

vi.mock("./utils/tracking-values", () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: "test-unique",
    visitToken: "test-visit",
    consent: "",
  })),
}));

beforeEach(() => {
  try {
    delete (window as any).Shopify;
  } catch {}

  vi.mocked(getTrackingValues).mockReturnValue({
    uniqueToken: "test-unique",
    visitToken: "test-visit",
    consent: "",
  });
});

const CONSENT_CONFIG = {
  publicStorefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
};

function createMockDeps(overrides = {}) {
  const onReady = vi.fn();
  return {
    deps: {
      consent: CONSENT_CONFIG,
      onReady,
      onConsentCollected: vi.fn(),
      ...overrides,
    },
    onReadyCalls: [onReady],
  };
}

/**
 * Simulates the consent script setting window.Shopify.customerPrivacy.
 * The real consent-tracking-api preserves the preloaded config object
 * when installing the full API.
 */
function simulateConsentScriptLoad() {
  const setTrackingConsent = vi.fn();
  (window as any).Shopify ??= {};
  (window as any).Shopify.customerPrivacy = {
    ...(window as any).Shopify.customerPrivacy,
    setTrackingConsent,
    analyticsProcessingAllowed: () => true,
    marketingAllowed: () => true,
    saleOfDataAllowed: () => true,
    shouldShowGDPRBanner: () => false,
  };

  return { setTrackingConsent };
}

async function flushConsentPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("visitorConsentCollected handling", () => {
  it("handles visitorConsentCollected in default banner mode", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "default-banner" },
    });
    initConsent(deps);

    simulateConsentScriptLoad();

    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));
    await flushConsentPromises();

    expect(deps.onReady).toHaveBeenCalledOnce();
    expect(deps.onConsentCollected).toHaveBeenCalledWith({
      shouldRevalidate: false,
    });
  });
});

describe("consent library integration", () => {
  beforeEach(() => {
    vi.mocked(loadScript).mockClear();
    vi.mocked(ensureTrackingValues).mockClear();
  });

  it("loads the standalone consent API in no-banner mode", async () => {
    const { deps } = createMockDeps();

    initConsent(deps);
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledOnce();
    expect(loadScript).toHaveBeenCalledWith(CONSENT_API, {
      attributes: { id: "customer-privacy-api" },
    });
  });

  it("loads only the privacy banner bundle in default-banner mode", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "default-banner" },
    });

    initConsent(deps);
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledOnce();
    expect(loadScript).toHaveBeenCalledWith(CONSENT_API_WITH_BANNER, {
      attributes: { id: "customer-privacy-api" },
    });
  });

  it("sets customerPrivacy.config before loading consent scripts", () => {
    const { deps } = createMockDeps();
    initConsent(deps);

    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
      storefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
    });
  });

  it("preserves existing window.Shopify values while installing config", () => {
    (window as any).Shopify = { analytics: { publish: vi.fn() } };
    const { deps } = createMockDeps();

    initConsent(deps);

    expect((window as any).Shopify.analytics).toBeDefined();
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
      storefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
    });
  });

  it("sets Shopify locale and country for privacy-banner localization", () => {
    const { deps } = createMockDeps({
      consent: {
        ...CONSENT_CONFIG,
        country: "CA",
        language: "en",
      },
    });

    initConsent(deps);

    expect((window as any).Shopify.locale).toBe("en");
    expect((window as any).Shopify.country).toBe("CA");
  });

  it("does not wrap setTrackingConsent after the consent API loads", () => {
    const callback = vi.fn();
    const { deps } = createMockDeps();
    initConsent(deps);
    const { setTrackingConsent } = simulateConsentScriptLoad();

    (window as any).Shopify.customerPrivacy.setTrackingConsent({ marketing: true }, callback);

    expect(setTrackingConsent).toHaveBeenCalledWith({ marketing: true }, callback);
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
      storefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
    });
  });

  it("loads privacy banner without a placeholder token when publicStorefrontAccessToken is omitted", async () => {
    const { deps } = createMockDeps({
      consent: { mode: "default-banner" },
    });
    initConsent(deps);
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledWith(CONSENT_API_WITH_BANNER, {
      attributes: { id: "customer-privacy-api" },
    });
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
    });
  });

  it("unblocks default banner mode when no banner interaction is needed", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "default-banner" },
    });

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    expect(deps.onReady).toHaveBeenCalledOnce();
    expect(deps.onConsentCollected).not.toHaveBeenCalled();
  });

  it("keeps default banner mode gated when banner interaction is needed", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "default-banner" },
    });

    initConsent(deps);
    const { customerPrivacy } = (window as any).Shopify;
    customerPrivacy.shouldShowGDPRBanner = () => true;
    await flushConsentPromises();

    expect(deps.onReady).not.toHaveBeenCalled();
  });

  it("loads the standalone consent API and waits for interaction in custom-banner mode", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "custom-banner" },
    });

    initConsent(deps);
    const { customerPrivacy } = (window as any).Shopify;
    customerPrivacy.shouldShowGDPRBanner = () => true;
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledWith(CONSENT_API, {
      attributes: { id: "customer-privacy-api" },
    });
    expect(deps.onReady).not.toHaveBeenCalled();

    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));

    expect(deps.onReady).toHaveBeenCalledOnce();
  });

  it("unblocks custom-banner mode when no banner interaction is needed", async () => {
    const { deps } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "custom-banner" },
    });

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledWith(CONSENT_API, {
      attributes: { id: "customer-privacy-api" },
    });
    expect(deps.onReady).toHaveBeenCalledOnce();
  });

  it("fetches tracking values through the SFAPI proxy by default", async () => {
    const { deps } = createMockDeps();
    initConsent(deps);
    await flushConsentPromises();

    expect(ensureTrackingValues).toHaveBeenCalledWith(
      undefined,
      "33ad0f277e864013b8e3c21d19432501",
    );
  });

  it("loads the consent script after tracking value bootstrap fails", async () => {
    vi.mocked(ensureTrackingValues).mockRejectedValueOnce(new Error("bootstrap failed"));
    const { deps } = createMockDeps();

    initConsent(deps);
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledWith(CONSENT_API, {
      attributes: { id: "customer-privacy-api" },
    });
  });

  it("runs consent without publicStorefrontAccessToken", async () => {
    const { deps } = createMockDeps({
      consent: {},
    });
    initConsent(deps);
    await flushConsentPromises();

    expect(ensureTrackingValues).toHaveBeenCalledWith(undefined, undefined);
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
    });
  });

  it("uses consentDomain when provided", async () => {
    const { deps } = createMockDeps({
      consent: {
        ...CONSENT_CONFIG,
        consentDomain: "https://www.example.com:8443/path",
      },
    });
    initConsent(deps);
    await flushConsentPromises();

    expect(ensureTrackingValues).toHaveBeenCalledWith(
      "www.example.com:8443",
      "33ad0f277e864013b8e3c21d19432501",
    );
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: "www.example.com:8443",
      storefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
    });
  });

  it("adds injectedConsent to customerPrivacy.config before loading the consent script", async () => {
    vi.mocked(getTrackingValues).mockReturnValue({
      uniqueToken: "test-unique",
      visitToken: "test-visit",
      consent: "3_consent",
    });
    const { deps } = createMockDeps();

    initConsent(deps);
    await flushConsentPromises();

    expect(loadScript).toHaveBeenCalledOnce();
    expect((window as any).Shopify.customerPrivacy.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
      storefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
      injectedConsent: "3_consent",
    });
  });

  it("uses the readiness callback for non-banner bootstrap", async () => {
    const { deps } = createMockDeps();

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    expect(deps.onReady).toHaveBeenCalledOnce();
    expect(deps.onConsentCollected).not.toHaveBeenCalled();
  });

  it("routes bootstrap readiness and later consent collection to separate callbacks", async () => {
    const { deps } = createMockDeps();

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    expect(deps.onReady).toHaveBeenCalledOnce();

    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));

    expect(deps.onReady).toHaveBeenCalledOnce();
    expect(deps.onConsentCollected).toHaveBeenCalledWith({
      shouldRevalidate: false,
    });
  });

  it("sets shouldRevalidate when consent collection changes tracking tokens", async () => {
    vi.mocked(getTrackingValues)
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValue({
        uniqueToken: "updated-unique",
        visitToken: "updated-visit",
        consent: "",
      });
    const { deps } = createMockDeps();

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));

    expect(deps.onConsentCollected).toHaveBeenCalledWith({
      shouldRevalidate: true,
    });
  });

  it("compares consent collection revalidation against the latest observed tracking tokens", async () => {
    vi.mocked(getTrackingValues)
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValueOnce({
        uniqueToken: "initial-unique",
        visitToken: "initial-visit",
        consent: "",
      })
      .mockReturnValueOnce({
        uniqueToken: "updated-unique",
        visitToken: "updated-visit",
        consent: "",
      })
      .mockReturnValue({
        uniqueToken: "updated-unique",
        visitToken: "updated-visit",
        consent: "",
      });
    const { deps } = createMockDeps();

    initConsent(deps);
    simulateConsentScriptLoad();
    await flushConsentPromises();

    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));
    document.dispatchEvent(new CustomEvent("visitorConsentCollected"));

    expect(deps.onConsentCollected).toHaveBeenNthCalledWith(1, {
      shouldRevalidate: true,
    });
    expect(deps.onConsentCollected).toHaveBeenNthCalledWith(2, {
      shouldRevalidate: false,
    });
  });
});

describe("consent config validation", () => {
  it("logs error when publicStorefrontAccessToken looks like a private token", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = createMockDeps({
      consent: {
        publicStorefrontAccessToken: "shpat_test_private_token_for_warning",
      },
    });
    initConsent(deps);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("private access token"));
    errorSpy.mockRestore();
  });
});

describe("privacy banner timeout fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unblocks bus after 10s timeout when banner has not collected consent", async () => {
    const { deps, onReadyCalls } = createMockDeps({
      consent: { ...CONSENT_CONFIG, mode: "default-banner" },
    });
    initConsent(deps);
    await flushConsentPromises();

    // Before timeout: not ready (consentGateReady is false, waiting for banner interaction)
    expect(onReadyCalls[0]).not.toHaveBeenCalled();

    // Advance past the 10-second banner timeout
    vi.advanceTimersByTime(10001);

    // Now ready — timeout set consentGateReady=true
    expect(onReadyCalls[0]).toHaveBeenCalled();
  });

  it("non-banner mode unblocks after consent script load", async () => {
    const { deps, onReadyCalls } = createMockDeps();
    initConsent(deps);
    await flushConsentPromises();

    expect(onReadyCalls[0]).toHaveBeenCalled();
  });
});

describe("initConsent instance isolation", () => {
  it("notifies each active initConsent instance independently", async () => {
    const instance1 = createMockDeps();
    const instance2 = createMockDeps();

    initConsent(instance1.deps);
    initConsent(instance2.deps);
    await flushConsentPromises();

    // Both instances' onReady should have been called
    expect(instance1.onReadyCalls[0]).toHaveBeenCalled();
    expect(instance2.onReadyCalls[0]).toHaveBeenCalled();
  });

  it("late initConsent call resolves when the already-loaded script promise resolves", async () => {
    const instance1 = createMockDeps();
    initConsent(instance1.deps);
    await flushConsentPromises();

    // First instance should be ready
    expect(instance1.onReadyCalls[0]).toHaveBeenCalled();

    // Now create a second instance AFTER consent has already resolved
    const instance2 = createMockDeps();
    initConsent(instance2.deps);
    await flushConsentPromises();

    expect(instance2.onReadyCalls[0]).toHaveBeenCalled();
  });
});
