// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
} from "../core/shopify-scripts/index";
import { createShopifyRouteTemplates } from "../core/standard-routes/index";
import { ShopifyScripts } from "./shopify-scripts";

afterEach(() => {
  cleanup();
  delete window.Shopify;
});

const TEST_SHOP_ID = "42";
const TEST_STOREFRONT_ID = "sub-1";
const TEST_RESOURCE_TIMING_SAMPLING_RATE = "10";
const TEST_SHOP = {
  shopId: TEST_SHOP_ID,
  storefrontId: TEST_STOREFRONT_ID,
};

describe("ShopifyScripts", () => {
  const emptyRouteTemplates = createShopifyRouteTemplates({});

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
      }),
    );

    expect(html).toContain('nonce="test-nonce"');
    expect(html).toContain("function initializeShopifyGlobal(config)");
    expect(html).toContain('"country":"US"');
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('"routes":{"root":"/"}');
    expect(html).not.toContain('"templates"');
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}"/>`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_SHOP_APP_ORIGIN}"/>`);
    expect(html).toContain(
      `<script src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}" type="module" crossorigin="anonymous" nonce="test-nonce"></script>`,
    );
    expect(html).toContain(`id="perfkit"`);
    expect(html).toContain(`async=""`);
    expect(html).toContain(`src="${SHOPIFY_PERF_KIT_SCRIPT}"`);
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

  it("always renders standard scripts", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        routes: emptyRouteTemplates,
      }),
    );

    expect(html).toContain("function initializeShopifyGlobal(config)");
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

  it("accepts disabled WebMCP without rendering SSR scripts", () => {
    const html = renderToStaticMarkup(
      createElement(ShopifyScripts, {
        routes: emptyRouteTemplates,
        webMcp: false,
      }),
    );

    expect(html).not.toContain(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT);
  });

  it("sets navigation hooks on mount and update", async () => {
    const navigate = vi.fn();
    const nextNavigate = vi.fn();
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
        navigate,
        routes: routeTemplates,
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

    rerender(
      createElement(ShopifyScripts, {
        navigate: nextNavigate,
        routes: routeTemplates,
      }),
    );

    await waitFor(() => {
      expect(window.Shopify?.navigate).toEqual(expect.any(Function));
    });
    window.Shopify?.navigate?.("/products/snowboard");
    expect(nextNavigate).toHaveBeenCalledWith("/p/snowboard");
  });
});
