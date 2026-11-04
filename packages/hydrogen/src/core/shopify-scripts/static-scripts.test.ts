// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import { ShopifyScripts as ReactShopifyScripts } from "../../react/shopify-scripts";
import { ShopifyScripts as VueShopifyScripts } from "../../vue/shopify-scripts";
import {
  getShopifyScriptTags,
  renderShopifyScriptTags,
  type ShopifyScriptTagsOptions,
} from "../index";
import { assert } from "../test-utils";

const shop = { shopId: "42", storefrontId: "storefront-one", myshopifyDomain: "one.myshopify.com" };
const options: ShopifyScriptTagsOptions = {
  shop,
  i18n: { country: "CA", language: "FR", currency: "CAD", pathPrefix: "/fr-ca" },
  consent: { mode: "default-banner" },
  analytics: {
    customData: { value: `"<&</script><script>throw new Error('injected')</script>\u2028\u2029` },
  },
};

function parseInlineScripts(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return [...document.querySelectorAll<HTMLScriptElement>("script:not([src])")];
}

afterEach(() => {
  vi.restoreAllMocks();
  delete window.Shopify;
});

it("keeps code stable across runtime configuration and nonce changes", () => {
  const initial = getShopifyScriptTags({ shop }).scripts.filter(
    (script) => script.innerHTML !== undefined,
  );
  const changed = getShopifyScriptTags({
    ...options,
    nonce: "new-nonce",
    shop: { ...shop, shopId: "84", myshopifyDomain: "two.myshopify.com" },
  }).scripts.filter((script) => script.innerHTML !== undefined);

  expect(initial).toHaveLength(2);
  expect(changed.map((script) => script.innerHTML)).toEqual(
    initial.map((script) => script.innerHTML),
  );
  expect(changed.map((script) => script.attributes?.["data-config"])).not.toEqual(
    initial.map((script) => script.attributes?.["data-config"]),
  );
});

it("rejects configuration from a named element shadowing document.currentScript", () => {
  const scripts = parseInlineScripts(renderShopifyScriptTags(options).join("\n"));
  expect(scripts).toHaveLength(2);

  for (const script of scripts) {
    const impostor = document.createElement("img");
    impostor.name = "currentScript";
    impostor.dataset.config = script.dataset.config;
    const readDataset = vi.spyOn(impostor, "dataset", "get");
    // Model the browser's named-property lookup, which can return a non-script element.
    vi.spyOn(document, "currentScript", "get").mockReturnValue(
      impostor as unknown as HTMLScriptElement,
    );

    expect(() => {
      // oxlint-disable-next-line no-eval -- Execute the actual serialized body with a shadowed currentScript.
      (0, eval)(script.textContent);
    }).toThrow(TypeError);
    expect(readDataset).not.toHaveBeenCalled();
    expect(window.Shopify).toBeUndefined();
  }
});

it.each(["html", "react", "vue"] as const)(
  "preserves script bytes and escaped configuration through %s rendering",
  async (renderer) => {
    const html =
      renderer === "react"
        ? renderToStaticMarkup(createElement(ReactShopifyScripts, options))
        : renderer === "vue"
          ? await renderToString(h(VueShopifyScripts, options))
          : renderShopifyScriptTags(options).join("\n");
    const scripts = parseInlineScripts(html);
    expect(scripts).toHaveLength(2);
    const originalCode = getShopifyScriptTags(options).scripts.flatMap((script) =>
      script.innerHTML === undefined ? [] : [script.innerHTML],
    );
    expect(scripts.map((script) => script.textContent)).toEqual(originalCode);

    for (const script of scripts) {
      expect(script.textContent).not.toContain("injected");
      vi.spyOn(document, "currentScript", "get").mockReturnValue(script);
      // oxlint-disable-next-line no-eval -- Execute the actual serialized body with its parsed attributes.
      (0, eval)(script.textContent);
    }

    expect(window.Shopify?.country).toBe("CA");
    expect(window.Shopify?.locale).toBe("fr");
    expect(window.Shopify?.currency).toEqual({ active: "CAD" });
    expect(window.Shopify?.shop).toBe(shop.myshopifyDomain);
    const analytics = window.Shopify?.analytics;
    assert(analytics, "Expected the inline analytics bootstrap to initialize its bus");
    expect(analytics.getConfig()).toMatchObject({
      shop: { shopId: "gid://shopify/Shop/42", storefrontId: "storefront-one" },
      consent: options.consent,
      customData: options.analytics?.customData,
    });
  },
);
