// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { act, createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as shopifyScriptsCore from "../core/shopify-scripts";
import {
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_CONSENT_API_SCRIPT,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_PRIVACY_BANNER_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_INBOX_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
} from "../core/shopify-scripts/index";
import { createShopifyRouteTemplates } from "../core/standard-routes/index";
import { assert } from "../core/test-utils";
import { ShopifyScripts } from "./shopify-scripts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete window.Shopify;
});

const TEST_SHOP_ID = "42";
const TEST_STOREFRONT_ID = "sub-1";
const TEST_MYSHOPIFY_DOMAIN = "test-shop.myshopify.com";
const TEST_RESOURCE_TIMING_SAMPLING_RATE = "10";
const TEST_SHOP = {
  shopId: TEST_SHOP_ID,
  storefrontId: TEST_STOREFRONT_ID,
  myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
};
const CONSENT = {
  mode: "default-banner" as const,
};

function mockShopifyScriptTags() {
  vi.spyOn(shopifyScriptsCore, "getShopifyScriptTags").mockReturnValue({
    links: [],
    scripts: [],
    tags: [],
  });
}

function concealScriptNonceAttributes() {
  const getAttribute = HTMLScriptElement.prototype.getAttribute;

  vi.spyOn(HTMLScriptElement.prototype, "getAttribute").mockImplementation(
    function (this: HTMLScriptElement, name) {
      return name.toLowerCase() === "nonce" ? "" : getAttribute.call(this, name);
    },
  );
}

async function hydrateShopifyScripts(serverHtml: string, nonce: string) {
  const container = document.createElement("div");
  container.innerHTML = serverHtml;
  // Happy DOM inserts an empty text node into every parsed script element. Browsers do not, and
  // React treats it as a structural mismatch before reaching the nonce attribute comparison.
  for (const script of container.querySelectorAll("script")) {
    for (const child of script.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent === "") child.remove();
    }
  }
  document.body.append(container);

  let root: Root | undefined;
  await act(async () => {
    root = hydrateRoot(container, createElement(ShopifyScripts, { nonce, shop: TEST_SHOP }));
  });
  assert(root, "Expected ShopifyScripts hydration to create a React root");

  return root;
}

describe("ShopifyScripts", () => {
  const emptyRouteTemplates = createShopifyRouteTemplates({});

  it("types and renders the raw Inbox custom element", () => {
    expect(renderToStaticMarkup(<shopify-chat />)).toBe("<shopify-chat></shopify-chat>");
  });

  it("renders Shopify storefront runtime scripts during SSR", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        i18n: { country: "US", language: "EN" },
        nonce: "test-nonce",
        routes: routeTemplates,
        shop: TEST_SHOP,
        inbox: true,
      }),
    );

    expect(html).toContain('nonce="test-nonce"');
    expect(html).toContain('"country":"US"');
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('"routes":{"root":"/"}');
    expect(html).toContain(`"shop":"${TEST_MYSHOPIFY_DOMAIN}"`);
    expect(html).toContain('"customerPrivacy":{"config":{"isHeadless":true}');
    expect(html).toContain("consentDomain=window.location.host");
    expect(html).toContain(`id="shopify-consent"`);
    expect(html).toContain(`src="${SHOPIFY_CONSENT_API_SCRIPT}"`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}"/>`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_SHOP_APP_ORIGIN}"/>`);
    expect(html).toContain(
      `<script id="shopify-standard-actions" type="module" crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}"></script>`,
    );
    expect(html).toContain(
      `<script id="shopify-inbox" type="module" async="" crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_INBOX_SCRIPT}"></script>`,
    );
    expect(html).not.toContain("<shopify-chat");
    expect(html).toContain(`id="shopify-perfkit"`);
    expect(html).toContain(`async=""`);
    expect(html).toContain(`src="${SHOPIFY_PERF_KIT_SCRIPT}"`);
    expect(html).toContain(`id="shopify-perfkit-spa-bridge"`);
    expect(html).toContain(`data-shop-id="${TEST_SHOP_ID}"`);
    expect(html).toContain(`data-storefront-id="${TEST_STOREFRONT_ID}"`);
    expect(html).toContain(
      `data-resource-timing-sampling-rate="${TEST_RESOURCE_TIMING_SAMPLING_RATE}"`,
    );
    expect(html).toContain(
      `<link rel="prefetch" as="script" href="${SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT}" crossorigin="anonymous"/>`,
    );
    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
  });

  it("suppresses hydration warnings caused by concealed script nonces", async () => {
    const html = renderToString(
      createElement(ShopifyScripts, { nonce: "test-nonce", shop: TEST_SHOP }),
    );
    concealScriptNonceAttributes();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const root = await hydrateShopifyScripts(html, "test-nonce");

    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("keeps hydration warnings for scripts without a nonce", async () => {
    const script = {
      tagName: "script" as const,
      attributes: { id: "nonce-free-script", "data-test": "expected" },
    };
    vi.spyOn(shopifyScriptsCore, "getShopifyScriptTags").mockReturnValue({
      links: [],
      scripts: [script],
      tags: [script],
    });
    const html = renderToString(
      createElement(ShopifyScripts, { nonce: "test-nonce", shop: TEST_SHOP }),
    ).replace('data-test="expected"', 'data-test="unexpected"');
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const root = await hydrateShopifyScripts(html, "test-nonce");

    expect(consoleError.mock.calls.flat().join(" ")).toContain("data-test");
    await act(async () => root.unmount());
  });

  it("hydrates an explicitly empty nonce against a concealed server nonce", async () => {
    const html = renderToString(
      createElement(ShopifyScripts, { nonce: "test-nonce", shop: TEST_SHOP }),
    );
    concealScriptNonceAttributes();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const root = await hydrateShopifyScripts(html, "");

    expect(consoleError).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("always renders standard scripts", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        routes: emptyRouteTemplates,
        shop: TEST_SHOP,
      }),
    );

    expect(html).toContain(SHOPIFY_CDN_ORIGIN);
    expect(html).toContain(SHOPIFY_SHOP_APP_ORIGIN);
    expect(html).toContain(SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT);
    expect(html).toContain(SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT);
    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
    expect(html).toContain('"country":"US"');
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('"routes":{"root":"/"}');
    expect(html).toContain('"customerPrivacy":{"config":{"isHeadless":true}');
    expect(html).toContain("consentDomain=window.location.host");
    expect(html).toContain(`id="shopify-consent"`);
    expect(html).toContain(`src="${SHOPIFY_CONSENT_API_SCRIPT}"`);
  });

  it("preserves Shopify script ordering during React SSR", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        i18n: { country: "US", language: "EN", currency: "USD" },
        shop: TEST_SHOP,
      }),
    );

    expect(html.indexOf('"consentStatus":"pending"')).toBeLessThan(
      html.indexOf(SHOPIFY_CONSENT_API_SCRIPT),
    );
    expect(html.indexOf(SHOPIFY_CONSENT_API_SCRIPT)).toBeLessThan(
      html.indexOf("visitorConsentCollected"),
    );
    expect(html.indexOf("visitorConsentCollected")).toBeLessThan(
      html.indexOf("Analytics bus already initialized"),
    );
    expect(html).toContain('"currency":{"active":"USD"}');
    expect(html).toContain('"shop":{"shopId":"42","storefrontId":"sub-1","channel":"hydrogen"}');
    expect(html.indexOf("Analytics bus already initialized")).toBeLessThan(
      html.indexOf("storefront/analytics/shopify.js"),
    );
    expect(html.indexOf("storefront/analytics/shopify.js")).toBeLessThan(
      html.indexOf(SHOPIFY_PERF_KIT_SCRIPT),
    );
  });

  it("renders consent scripts during SSR when consent is provided", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, { consent: CONSENT, shop: TEST_SHOP }),
    );

    expect(html).toContain(`id="shopify-consent"`);
    expect(html).toContain(`src="${SHOPIFY_PRIVACY_BANNER_SCRIPT}"`);
    expect(html).toContain(`async=""`);
    expect(html).toContain('"consentStatus":"pending"');
    expect(html).toContain("consentDomain=window.location.host");
  });

  it("accepts disabled WebMCP without rendering SSR scripts", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        routes: emptyRouteTemplates,
        shop: TEST_SHOP,
        webMcp: false,
      }),
    );

    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
  });

  it("initializes browser script behavior once with initial props", async () => {
    mockShopifyScriptTags();
    const initializeShopifyScripts = vi.spyOn(shopifyScriptsCore, "initializeShopifyScripts");
    const navigate = vi.fn();
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    (window as any).Shopify = {
      routes: {
        root: "/",
      },
    };
    const { rerender } = render(
      createElement(ShopifyScripts, {
        consent: CONSENT,
        navigate,
        routes: routeTemplates,
        shop: TEST_SHOP,
        inbox: true,
      }),
    );

    await waitFor(() => {
      expect(window.Shopify?.navigate).toEqual(expect.any(Function));
      expect(window.Shopify?.routes.match?.("/p/snowboard")).toEqual({
        route: "product",
        params: { productHandle: "snowboard" },
      });
      expect(window.Shopify?.routes.resolve?.("/products/snowboard")).toBe("/p/snowboard");
    });
    window.Shopify?.navigate?.("/products/snowboard");
    expect(navigate).toHaveBeenCalledWith("/p/snowboard");
    expect(initializeShopifyScripts).toHaveBeenCalledWith({
      navigate,
      routes: routeTemplates,
      webMcp: true,
    });
    expect(document.body.querySelector("shopify-chat")).toBeNull();

    rerender(
      createElement(ShopifyScripts, {
        consent: { ...CONSENT, mode: "no-banner" },
        navigate: vi.fn(),
        routes: routeTemplates,
        shop: TEST_SHOP,
      }),
    );

    expect(initializeShopifyScripts).toHaveBeenCalledOnce();
  });
});
