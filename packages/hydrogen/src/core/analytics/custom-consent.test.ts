// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShopifyGlobal } from "../../globals";
import { getShopifyScriptTags, initializeShopifyScripts } from "../shopify-scripts";
import {
  CONSENT_TRACKING_API_LOADED_EVENT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts/constants";
import { assert } from "../test-utils";
import { setupStorefrontAnalytics } from "./bus";
import { initializeCustomConsent } from "./custom-consent";
import type { ConsentPreferences, ConsentSetup, ConsentSetupContext } from "./types";

const allowed: ConsentPreferences = {
  analytics: true,
  marketing: true,
  preferences: true,
  sale_of_data: true,
};
const denied: ConsentPreferences = {
  analytics: false,
  marketing: false,
  preferences: false,
  sale_of_data: false,
};

function createHarness(status: "loading" | "loaded" = "loaded") {
  let analyticsAllowed = true;
  const requests: ReturnType<typeof Promise.withResolvers<void>>[] = [];
  const privacy = {
    consentStatus: status,
    currentVisitorConsent: () => ({ analytics: analyticsAllowed ? "yes" : "no" }),
    analyticsProcessingAllowed: () => analyticsAllowed,
    setTrackingConsent: vi.fn<ShopifyGlobal["customerPrivacy"]["setTrackingConsent"]>(
      (choice, callback) => {
        const request = Promise.withResolvers<void>();
        requests.push(request);
        return request.promise.then(() => {
          analyticsAllowed = choice.analytics === true;
          // CTA updates its cache and emits before completing the write callback/promise.
          document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
          callback(undefined);
        });
      },
    ),
  };
  window.Shopify = { customerPrivacy: privacy } as unknown as ShopifyGlobal;
  const bus = setupStorefrontAnalytics({ shop: null, consent: { mode: "custom-banner" } });
  const destination = vi.fn();
  bus.addDestination({
    name: "test",
    setup({ subscribe }) {
      subscribe("page_viewed", destination);
    },
  });

  let context: ConsentSetupContext | undefined;
  const setupComplete = Promise.withResolvers<void>();
  const mount = (setup: ConsentSetup = () => setupComplete.promise) =>
    initializeCustomConsent((value) => {
      context = value;
      return setup(value);
    });
  const getContext = () => {
    assert(context, "Expected custom setup to run after CTA loaded");
    return context;
  };
  const request = (index = 0) => {
    const value = requests[index];
    assert(value, `Expected consent request ${index}`);
    return value;
  };
  return { bus, destination, privacy, mount, getContext, request, setupComplete };
}

afterEach(() => {
  window.Shopify?.analytics?.destroy();
  delete window.Shopify;
  vi.restoreAllMocks();
});

describe("custom banner consent", () => {
  it("keeps regional defaults and raw CTA events pending until the provider synchronizes", async () => {
    const h = createHarness();
    h.bus.publish("page_viewed", { url: "/before-hydration" });
    document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
    document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
    expect(h.destination).not.toHaveBeenCalled();

    // Setup stays pending while the provider waits for a choice.
    h.mount();
    h.bus.publish("page_viewed", { url: "/banner-open" });
    expect(h.destination).not.toHaveBeenCalled();

    const write = h.getContext().setTrackingConsent(allowed);
    h.request().resolve();
    await write;
    expect(h.destination).not.toHaveBeenCalled();
    h.setupComplete.resolve();

    await vi.waitFor(() =>
      expect(h.destination.mock.calls.map(([payload]) => payload.url)).toEqual([
        "/before-hydration",
        "/banner-open",
      ]),
    );
  });

  it("waits for CTA readiness and invokes setup only once, including repeated readiness events", () => {
    const h = createHarness("loading");
    const setup = vi.fn<ConsentSetup>(async () => {});
    h.mount(setup);
    expect(setup).not.toHaveBeenCalled();
    h.privacy.consentStatus = "loaded";
    document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
    document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
    document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
    expect(setup).toHaveBeenCalledOnce();
  });

  it("trusts setup completion without requiring a call to the supplied setter", async () => {
    const h = createHarness();
    h.mount();
    h.bus.publish("page_viewed");
    expect(h.destination).not.toHaveBeenCalled();
    h.setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
    expect(h.privacy.setTrackingConsent).not.toHaveBeenCalled();
  });

  it("keeps delivery pending until setup resolves, even after a successful consent write", async () => {
    const h = createHarness();
    const setupComplete = Promise.withResolvers<void>();
    h.mount(() => setupComplete.promise);
    h.bus.publish("page_viewed");
    const write = h.getContext().setTrackingConsent(allowed);
    h.request().resolve();
    await write;
    expect(h.destination).not.toHaveBeenCalled();
    setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
  });

  it("can synchronize saved consent immediately when setup attaches after CTA loaded", async () => {
    const h = createHarness();
    h.bus.publish("page_viewed", { url: "/saved" });
    let write: Promise<void> | undefined;
    h.mount(({ setTrackingConsent }) => {
      write = setTrackingConsent(allowed);
      return write;
    });
    h.request().resolve();
    await write;
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
  });

  it("discards denied events and starts recording again after a later grant", async () => {
    const h = createHarness();
    h.mount();
    h.bus.publish("page_viewed", { url: "/before-denial" });
    const first = h.getContext().setTrackingConsent(denied);
    h.request().resolve();
    await first;
    h.setupComplete.resolve();
    await h.setupComplete.promise;
    h.bus.publish("page_viewed", { url: "/while-denied" });
    expect(h.destination).not.toHaveBeenCalled();

    const second = h.getContext().setTrackingConsent(allowed);
    h.request(1).resolve();
    await second;
    expect(h.destination).not.toHaveBeenCalled();
    h.bus.publish("page_viewed", { url: "/after-grant" });
    expect(h.destination).toHaveBeenCalledOnce();
    expect(h.destination.mock.calls[0][0].url).toBe("/after-grant");
  });

  it("uses ordinary CTA events for consent changes after initial setup", async () => {
    const h = createHarness();
    h.mount();
    h.bus.publish("page_viewed", { url: "/initial" });
    const initial = h.getContext().setTrackingConsent(allowed);
    h.request().resolve();
    await initial;
    h.setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());

    // Later changes use the existing consent event flow, including direct CTA callers.
    const revoke = h.privacy.setTrackingConsent(denied, () => {});
    h.request(1).resolve();
    await revoke;
    h.bus.publish("page_viewed", { url: "/denied" });
    expect(h.destination).toHaveBeenCalledOnce();

    const grant = h.privacy.setTrackingConsent(allowed, () => {});
    h.request(2).resolve();
    await grant;
    h.bus.publish("page_viewed", { url: "/granted" });
    expect(h.destination.mock.calls.map(([payload]) => payload.url)).toEqual([
      "/initial",
      "/granted",
    ]);
  });

  it("keeps initial consent pending after a failed write and allows a retry", async () => {
    const h = createHarness();
    h.mount();
    h.bus.publish("page_viewed", { url: "/retry" });
    const first = h.getContext().setTrackingConsent(allowed);
    const rejection = expect(first).rejects.toThrow("offline");
    h.request().reject(new Error("offline"));
    await rejection;
    document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
    expect(h.destination).not.toHaveBeenCalled();

    const retry = h.getContext().setTrackingConsent(allowed);
    h.request(1).resolve();
    await retry;
    h.setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
  });

  it("supports callback-only CTA writes without treating undefined return as success", async () => {
    const h = createHarness();
    let callback: Parameters<ShopifyGlobal["customerPrivacy"]["setTrackingConsent"]>[1] | undefined;
    h.privacy.setTrackingConsent.mockImplementation((_choice, value) => {
      callback = value;
    });
    h.mount();
    h.bus.publish("page_viewed");
    const write = h.getContext().setTrackingConsent(allowed);
    await Promise.resolve();
    expect(h.destination).not.toHaveBeenCalled();
    assert(callback, "Expected a CTA completion callback");
    callback(undefined);
    await write;
    h.setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
  });

  it("rejects callback errors without opening delivery", async () => {
    const h = createHarness();
    h.privacy.setTrackingConsent.mockImplementation((_choice, callback) => {
      callback({ error: "permission update failed" });
      return Promise.resolve();
    });
    h.mount();
    await expect(h.getContext().setTrackingConsent(allowed)).rejects.toThrow(
      "permission update failed",
    );
    h.bus.publish("page_viewed");
    expect(h.destination).not.toHaveBeenCalled();
  });

  it("rejects thrown and promise-only errors, and accepts a promise-only retry", async () => {
    const h = createHarness();
    h.mount();
    h.privacy.setTrackingConsent
      .mockImplementationOnce(() => {
        throw new Error("invalid choice");
      })
      .mockRejectedValueOnce(new Error("network"));
    await expect(h.getContext().setTrackingConsent(allowed)).rejects.toThrow("invalid choice");
    await expect(h.getContext().setTrackingConsent(allowed)).rejects.toThrow("network");
    h.bus.publish("page_viewed");
    expect(h.destination).not.toHaveBeenCalled();
    h.privacy.setTrackingConsent.mockResolvedValueOnce(undefined);
    await h.getContext().setTrackingConsent(allowed);
    h.setupComplete.resolve();
    await vi.waitFor(() => expect(h.destination).toHaveBeenCalledOnce());
  });

  it("cancels setup waiting for CTA when the bus is destroyed", () => {
    const h = createHarness("loading");
    const setup = vi.fn<ConsentSetup>(async () => {});
    h.mount(setup);
    h.bus.destroy();
    h.privacy.consentStatus = "loaded";
    document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
    expect(setup).not.toHaveBeenCalled();
  });

  it("ignores an old write after destruction and keeps a new bus pending", async () => {
    const h = createHarness();
    h.mount();
    const first = h.getContext().setTrackingConsent(allowed);
    h.bus.destroy();

    const nextBus = setupStorefrontAnalytics({ shop: null, consent: { mode: "custom-banner" } });
    const destination = vi.fn();
    nextBus.addDestination({
      name: "next",
      setup: ({ subscribe }) => {
        subscribe("page_viewed", destination);
      },
    });
    const pendingSetup = Promise.withResolvers<void>();
    const setup = vi.fn<ConsentSetup>(() => pendingSetup.promise);
    initializeCustomConsent(setup);
    // Destruction does not cancel a backend write already sent, but its completion
    // must not release events or affect the new bus's pending provider integration.
    h.request().resolve();
    await first;
    h.setupComplete.resolve();
    await h.setupComplete.promise;
    nextBus.publish("page_viewed");
    expect(setup).toHaveBeenCalledOnce();
    expect(h.destination).not.toHaveBeenCalled();
    expect(destination).not.toHaveBeenCalled();
  });

  it.each([false, true])("logs a setup failure and stays blocked (async: %s)", async (async) => {
    const h = createHarness();
    const error = new Error("provider failed");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    h.mount(() => {
      if (async) return Promise.reject(error);
      throw error;
    });
    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith(
        "[hydrogen:error:consent] custom consent setup failed",
        error,
      ),
    );
    h.bus.publish("page_viewed");
    expect(h.destination).not.toHaveBeenCalled();
    const replacement = vi.fn<ConsentSetup>(async () => {});
    initializeCustomConsent(replacement);
    expect(replacement).not.toHaveBeenCalled();
  });

  it.each(["loading", "loaded"] as const)(
    "keeps the first integration on repeated initialization (CTA: %s)",
    (status) => {
      const h = createHarness(status);
      const setup = vi.fn<ConsentSetup>(async () => {});
      const replacement = vi.fn<ConsentSetup>(async () => {});
      h.mount(setup);
      initializeCustomConsent(replacement);
      h.privacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
      initializeCustomConsent(replacement);
      expect(setup).toHaveBeenCalledOnce();
      expect(replacement).not.toHaveBeenCalled();
    },
  );

  it("connects hydrated setup to the serialized bus without serializing the callback", async () => {
    const setupComplete = Promise.withResolvers<void>();
    const setup = vi.fn<ConsentSetup>(async function browserOnlyConsentProvider() {
      await setupComplete.promise;
    });
    const consent = { mode: "custom-banner", setup } as const;
    const { scripts } = getShopifyScriptTags({
      shop: { shopId: "42", storefrontId: "1", myshopifyDomain: "test.myshopify.com" },
      consent,
    });
    const bootstrap = scripts.find(
      (script) => script.attributes?.id === "shopify-analytics-bus",
    )?.innerHTML;
    assert(bootstrap, "Expected the serialized analytics bootstrap");
    expect(bootstrap).not.toContain("browserOnlyConsentProvider");
    expect(setup).not.toHaveBeenCalled();

    // Real inline bundle and app imports must agree on the private setup hook.
    // oxlint-disable-next-line no-eval -- Executes the SSR analytics bootstrap in happy-dom.
    eval(bootstrap);
    const bus = window.Shopify?.analytics;
    assert(bus, "Expected analytics to be installed by the inline script");
    expect(bus.getConfig().consent).toEqual({ mode: "custom-banner" });
    const destination = vi.fn();
    bus.addDestination({
      name: "cdn",
      setup: ({ subscribe }) => {
        subscribe("page_viewed", destination);
      },
    });
    bus.publish("page_viewed");
    expect(destination).not.toHaveBeenCalled();

    assert(window.Shopify, "Expected Shopify global");
    window.Shopify.customerPrivacy = {
      consentStatus: "loaded",
      analyticsProcessingAllowed: () => true,
      setTrackingConsent: (_choice, callback) => callback(undefined),
    } as ShopifyGlobal["customerPrivacy"];
    await initializeShopifyScripts({ consent, webMcp: false });
    expect(setup).toHaveBeenCalledOnce();
    expect(destination).not.toHaveBeenCalled();
    expect(setup).toHaveBeenCalledWith({ setTrackingConsent: expect.any(Function) });
    const context = setup.mock.calls[0][0];
    await context.setTrackingConsent(allowed);
    expect(destination).not.toHaveBeenCalled();
    setupComplete.resolve();
    await vi.waitFor(() => expect(destination).toHaveBeenCalled());
    bus.destroy();
  });
});
