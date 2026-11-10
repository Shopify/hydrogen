// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

import { assert } from "../test-utils";
import { CONSENT_TRACKING_API_LOADED_EVENT, SHOPIFY_CONSENT_SCRIPT_ID } from "./constants";
import {
  getShopifyScriptTags,
  renderShopifyScriptTags,
  SHOPIFY_CONSENT_API_SCRIPT,
  SHOPIFY_PRIVACY_BANNER_SCRIPT,
} from "./index";

const CONSENT = {};
const SHOP = {
  shopId: "42",
  storefrontId: "sub-1",
  myshopifyDomain: "test-shop.myshopify.com",
};

describe("consent script tags", () => {
  it("renders the standalone consent API as an async script when consent is omitted", () => {
    const { scripts } = getShopifyScriptTags({ shop: SHOP });

    expect(scripts[0].attributes?.["data-config"]).toContain(
      '"config":{"isHeadless":true,"asyncConsent":true,"asyncVisitorState":true,"debug":{"hydrogen":{"generation":3,"serverTiming":false}}}',
    );
    expect(scripts[0].innerHTML).toContain("consentDomain=window.location.host");
    expect(scripts).toContainEqual(
      expect.objectContaining({
        tagName: "script",
        attributes: expect.objectContaining({
          id: "shopify-consent",
          src: SHOPIFY_CONSENT_API_SCRIPT,
          async: true,
          crossorigin: "anonymous",
        }),
      }),
    );
  });

  it("renders the standalone consent API as an async script by default", () => {
    const { scripts } = getShopifyScriptTags({ consent: CONSENT, shop: SHOP });

    expect(scripts).toContainEqual(
      expect.objectContaining({
        tagName: "script",
        attributes: expect.objectContaining({
          id: "shopify-consent",
          src: SHOPIFY_CONSENT_API_SCRIPT,
          async: true,
          crossorigin: "anonymous",
        }),
      }),
    );
  });

  it("renders the privacy banner as an async script in default banner mode", () => {
    const { scripts } = getShopifyScriptTags({
      consent: {
        ...CONSENT,
        mode: "default-banner",
      },
      nonce: "test-nonce",
      shop: SHOP,
    });

    expect(scripts).toContainEqual(
      expect.objectContaining({
        tagName: "script",
        attributes: expect.objectContaining({
          id: "shopify-consent",
          src: SHOPIFY_PRIVACY_BANNER_SCRIPT,
          async: true,
          crossorigin: "anonymous",
          nonce: "test-nonce",
        }),
      }),
    );
  });

  it("installs consent readiness listeners before loading the consent script", () => {
    const { scripts } = getShopifyScriptTags({ consent: CONSENT, shop: SHOP });
    const analyticsBusIndex = scripts.findIndex(
      (script) => script.attributes?.id === "shopify-analytics-bus",
    );
    const consentApiIndex = scripts.findIndex(
      (script) => script.attributes?.id === SHOPIFY_CONSENT_SCRIPT_ID,
    );

    expect(scripts[0].attributes?.["data-config"]).toContain(
      '"asyncConsent":true,"asyncVisitorState":true',
    );
    expect(scripts[0].innerHTML).toContain("consentDomain=window.location.host");
    expect(analyticsBusIndex).toBeGreaterThan(0);
    expect(scripts[analyticsBusIndex].innerHTML).toContain(CONSENT_TRACKING_API_LOADED_EVENT);
    expect(consentApiIndex).toBeGreaterThan(analyticsBusIndex);
  });

  it("sets consentDomain to the current host", () => {
    const parsed = new DOMParser().parseFromString(
      renderShopifyScriptTags({ shop: SHOP }).join(""),
      "text/html",
    );
    const script = parsed.querySelector<HTMLScriptElement>("#shopify-global-bootstrap");
    assert(script, "Expected the rendered global bootstrap element");
    const currentScript = vi.spyOn(document, "currentScript", "get").mockReturnValue(script);
    try {
      // oxlint-disable-next-line no-eval -- Execute the serialized bootstrap with its rendered attributes.
      (0, eval)(script.textContent);
    } finally {
      currentScript.mockRestore();
    }

    expect(window.Shopify?.customerPrivacy?.config).toEqual({
      isHeadless: true,
      asyncConsent: true,
      asyncVisitorState: true,
      consentDomain: window.location.host,
      debug: {
        hydrogen: {
          generation: 3,
          serverTiming: false,
        },
      },
    });
    expect(window.Shopify?.customerPrivacy?.consentStatus).toBeUndefined();
  });

  it("renders consent tags to HTML", () => {
    const html = renderShopifyScriptTags({ shop: SHOP }).join("");

    expect(html).toContain(`id="shopify-consent"`);
    expect(html).toContain(`src="${SHOPIFY_CONSENT_API_SCRIPT}"`);
    expect(html).toContain("async");
  });
});
