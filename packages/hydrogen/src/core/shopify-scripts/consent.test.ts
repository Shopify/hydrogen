// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assert } from "../test-utils";
import { getShopifyConsentTrackingScript } from "./consent";
import { VISITOR_CONSENT_COLLECTED_EVENT } from "./constants";

function noop() {}

describe("consent helpers", () => {
  let restoreDocumentListeners = noop;

  beforeEach(() => {
    const listeners: Array<{
      type: string;
      listener: EventListenerOrEventListenerObject;
      options?: boolean | AddEventListenerOptions;
    }> = [];
    const addEventListener = document.addEventListener.bind(document);
    const trackDocumentListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      listeners.push({ type, listener, options });
      return addEventListener(type, listener, options);
    };

    vi.spyOn(document, "addEventListener").mockImplementation(
      trackDocumentListener as typeof document.addEventListener,
    );

    restoreDocumentListeners = () => {
      for (const { type, listener, options } of listeners) {
        document.removeEventListener(type, listener, options);
      }
      restoreDocumentListeners = noop;
    };
  });

  afterEach(() => {
    restoreDocumentListeners();
    vi.restoreAllMocks();
    document.body.replaceChildren();
    delete window.Shopify;
    delete (window as unknown as { privacyBanner?: unknown }).privacyBanner;
  });

  it("requests initial consent and marks consent loaded after the consent API script loads", () => {
    const consentEvents: Array<CustomEvent<Record<string, unknown>>> = [];
    const setTrackingConsent = vi.fn((_consent: Record<string, unknown>, callback?: () => void) => {
      callback?.();
      const event = new CustomEvent<Record<string, unknown>>(VISITOR_CONSENT_COLLECTED_EVENT, {
        detail: {},
      });
      document.dispatchEvent(event);
      consentEvents.push(event);
    });

    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent,
      },
    } as unknown as typeof window.Shopify;
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript());
    consentScript.dispatchEvent(new Event("load"));

    expect(setTrackingConsent).toHaveBeenCalledWith(
      { headlessStorefront: true },
      expect.any(Function),
    );
    const customerPrivacy = window.Shopify?.customerPrivacy;
    assert(customerPrivacy, "customerPrivacy should be initialized");
    expect(customerPrivacy.consentStatus).toBe("loaded");
    expect(consentEvents[0]?.detail).toMatchObject({ source: "initial" });

    const interactionEvent = new CustomEvent<Record<string, unknown>>(
      VISITOR_CONSENT_COLLECTED_EVENT,
      { detail: {} },
    );
    document.dispatchEvent(interactionEvent);

    expect(interactionEvent.detail).toMatchObject({ source: "interaction" });
  });

  it("keeps consent pending until the initial consent event is collected", () => {
    const setTrackingConsent = vi.fn();

    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent,
      },
    } as unknown as typeof window.Shopify;
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript());
    consentScript.dispatchEvent(new Event("load"));

    expect(setTrackingConsent).toHaveBeenCalledWith(
      { headlessStorefront: true },
      expect.any(Function),
    );
    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("pending");

    document.dispatchEvent(
      new CustomEvent<Record<string, unknown>>(VISITOR_CONSENT_COLLECTED_EVENT, {
        detail: { source: "initial" },
      }),
    );

    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("loaded");
  });

  it("marks consent loaded when the initial consent request callback runs", () => {
    const setTrackingConsent = vi.fn((_consent: Record<string, unknown>, callback?: () => void) => {
      callback?.();
    });

    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent,
      },
    } as unknown as typeof window.Shopify;
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript());
    consentScript.dispatchEvent(new Event("load"));

    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("loaded");
  });

  it("marks consent loaded after privacy-banner emits initial consent", () => {
    const setTrackingConsent = vi.fn();
    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent,
      },
    } as unknown as typeof window.Shopify;
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript({ mode: "default-banner" }));
    consentScript.dispatchEvent(new Event("load"));

    const customerPrivacy = window.Shopify?.customerPrivacy;
    assert(customerPrivacy, "customerPrivacy should be initialized");
    expect(setTrackingConsent).not.toHaveBeenCalled();
    expect(customerPrivacy.consentStatus).toBe("pending");

    const initialConsentEvent = new CustomEvent<Record<string, unknown>>(
      VISITOR_CONSENT_COLLECTED_EVENT,
      { detail: {} },
    );
    const interactionConsentEvent = new CustomEvent<Record<string, unknown>>(
      VISITOR_CONSENT_COLLECTED_EVENT,
      { detail: {} },
    );
    document.dispatchEvent(initialConsentEvent);
    expect(customerPrivacy.consentStatus).toBe("loaded");

    document.dispatchEvent(interactionConsentEvent);

    expect(customerPrivacy.consentStatus).toBe("loaded");
    expect(initialConsentEvent.detail).toMatchObject({ source: "initial" });
    expect(interactionConsentEvent.detail).toMatchObject({ source: "interaction" });
  });

  it("marks default banner consent events by phase", () => {
    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent: vi.fn(),
      },
    } as unknown as typeof window.Shopify;
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript({ mode: "default-banner" }));
    consentScript.dispatchEvent(new Event("load"));

    const firstConsentEvent = new CustomEvent<Record<string, unknown>>(
      VISITOR_CONSENT_COLLECTED_EVENT,
      { detail: {} },
    );
    const secondConsentEvent = new CustomEvent<Record<string, unknown>>(
      VISITOR_CONSENT_COLLECTED_EVENT,
      { detail: {} },
    );

    document.dispatchEvent(firstConsentEvent);
    document.dispatchEvent(secondConsentEvent);

    expect(firstConsentEvent.detail).toMatchObject({ source: "initial" });
    expect(secondConsentEvent.detail).toMatchObject({ source: "interaction" });
  });

  it("marks consent loaded after privacy banner emits initial consent when no banner is required", () => {
    const setTrackingConsent = vi.fn((_consent: Record<string, unknown>, callback?: () => void) => {
      callback?.();
    });
    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        setTrackingConsent,
        shouldShowBanner: () => false,
      },
    } as unknown as typeof window.Shopify;
    (window as unknown as { privacyBanner: {} }).privacyBanner = {};
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript({ mode: "default-banner" }));
    consentScript.dispatchEvent(new Event("load"));

    expect(setTrackingConsent).not.toHaveBeenCalled();
    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("pending");

    document.dispatchEvent(
      new CustomEvent<Record<string, unknown>>(VISITOR_CONSENT_COLLECTED_EVENT, {
        detail: {},
      }),
    );

    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("loaded");
  });

  it("does not replay or configure the privacy banner", () => {
    const loadBanner = vi.fn();
    window.Shopify = {
      customerPrivacy: {
        config: { isHeadless: true },
        consentStatus: "pending",
        shouldShowBanner: () => true,
      },
    } as unknown as typeof window.Shopify;
    (window as unknown as { privacyBanner: { loadBanner: typeof loadBanner } }).privacyBanner = {
      loadBanner,
    };
    const consentScript = document.createElement("script");
    consentScript.id = "shopify-consent";
    document.body.append(consentScript);

    // oxlint-disable-next-line no-eval -- Executes the serialized consent bootstrap script.
    eval(getShopifyConsentTrackingScript({ mode: "default-banner" }));
    consentScript.dispatchEvent(new Event("load"));
    document.dispatchEvent(
      new CustomEvent<Record<string, unknown>>(VISITOR_CONSENT_COLLECTED_EVENT, {
        detail: {},
      }),
    );

    const customerPrivacy = window.Shopify?.customerPrivacy;
    assert(customerPrivacy, "customerPrivacy should be initialized");
    expect("injectedConsent" in (customerPrivacy.config ?? {})).toBe(false);
    expect(loadBanner).not.toHaveBeenCalled();
  });
});
