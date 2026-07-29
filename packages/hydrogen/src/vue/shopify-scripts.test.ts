// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import {
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_INBOX_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
} from "../core/shopify-scripts";
import * as shopifyScriptsCore from "../core/shopify-scripts";
import { createShopifyRouteTemplates } from "../core/standard-routes/index";
import { ShopifyScripts } from "./shopify-scripts";

afterEach(() => {
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

describe("ShopifyScripts", () => {
  const emptyRouteTemplates = createShopifyRouteTemplates({});

  it("renders Shopify storefront runtime scripts during SSR", async () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    const html = await renderToString(
      h(ShopifyScripts, {
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
    expect(html).not.toContain('"templates"');
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}">`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_SHOP_APP_ORIGIN}">`);
    expect(html).toContain(
      `<script id="shopify-standard-actions" type="module" crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}"></script>`,
    );
    expect(html).toContain(
      `<script id="shopify-inbox" type="module" async crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_INBOX_SCRIPT}"></script>`,
    );
    expect(html).not.toContain("<shopify-chat");
    expect(html).toContain(`id="shopify-perfkit"`);
    expect(html).toContain(`async`);
    expect(html).toContain(`src="${SHOPIFY_PERF_KIT_SCRIPT}"`);
    expect(html).toContain(`id="shopify-perfkit-spa-bridge"`);
    expect(html).toContain(`data-shop-id="${TEST_SHOP_ID}"`);
    expect(html).toContain(`data-storefront-id="${TEST_STOREFRONT_ID}"`);
    expect(html).toContain(
      `data-resource-timing-sampling-rate="${TEST_RESOURCE_TIMING_SAMPLING_RATE}"`,
    );
    expect(html).toContain(
      `<link rel="prefetch" as="script" href="${SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT}" crossorigin="anonymous">`,
    );
    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
  });

  it("always renders standard scripts", async () => {
    const html = await renderToString(
      h(ShopifyScripts, {
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
    expect(html).not.toContain('"templates"');
  });

  it("accepts disabled WebMCP without rendering SSR scripts", async () => {
    const html = await renderToString(
      h(ShopifyScripts, {
        routes: emptyRouteTemplates,
        shop: TEST_SHOP,
        webMcp: false,
      }),
    );

    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
  });

  it("initializes browser script behavior once with initial props", async () => {
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
    const wrapper = mount(ShopifyScripts, {
      props: {
        consent: CONSENT,
        navigate,
        routes: routeTemplates,
        shop: TEST_SHOP,
        inbox: true,
      },
    });

    await vi.waitFor(() => {
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

    await wrapper.setProps({
      consent: { ...CONSENT, mode: "no-banner" },
    });

    expect(initializeShopifyScripts).toHaveBeenCalledOnce();
  });
});
