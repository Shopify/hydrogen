// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { SHOPIFY_CONSENT_SCRIPT_ID } from "./constants";
import {
  getShopifyGlobalBootstrapScript,
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
const I18N = { country: "US", language: "EN", currency: "USD" } as const;

describe("consent script tags", () => {
  it("renders the standalone consent API as an async script when consent is omitted", () => {
    const { scripts } = getShopifyScriptTags({ i18n: I18N, shop: SHOP });

    expect(scripts[0].innerHTML).toContain('"consentStatus":"pending"');
    expect(scripts[0].innerHTML).toContain('"config":{"isHeadless":true}');
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
    const { scripts } = getShopifyScriptTags({ consent: CONSENT, i18n: I18N, shop: SHOP });

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
      i18n: I18N,
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

  it("bootstraps customer privacy config before consent scripts", () => {
    const { scripts } = getShopifyScriptTags({ consent: CONSENT, i18n: I18N, shop: SHOP });
    const consentApiIndex = scripts.findIndex(
      (script) => script.attributes?.id === SHOPIFY_CONSENT_SCRIPT_ID,
    );
    const consentBootstrapScript = scripts.find(
      (script) => script.attributes?.id === "shopify-consent-bootstrap",
    );

    expect(scripts[0].innerHTML).toContain('"consentStatus":"pending"');
    expect(scripts[0].innerHTML).toContain("consentDomain=window.location.host");
    expect(consentApiIndex).toBeGreaterThan(0);
    expect(consentBootstrapScript?.innerHTML).toContain(
      `"scriptId":"${SHOPIFY_CONSENT_SCRIPT_ID}"`,
    );
  });

  it("sets consentDomain to the current host", () => {
    const script = getShopifyGlobalBootstrapScript({ shop: SHOP });

    // oxlint-disable-next-line no-eval -- Executes the serialized bootstrap script in happy-dom.
    eval(script);

    expect(window.Shopify?.customerPrivacy?.config).toEqual({
      isHeadless: true,
      consentDomain: window.location.host,
    });
    expect(window.Shopify?.customerPrivacy?.consentStatus).toBe("pending");
  });

  it("renders consent tags to HTML", () => {
    const html = renderShopifyScriptTags({ i18n: I18N, shop: SHOP }).join("");

    expect(html).toContain(`id="shopify-consent"`);
    expect(html).toContain(`src="${SHOPIFY_CONSENT_API_SCRIPT}"`);
    expect(html).toContain("async");
  });
});
