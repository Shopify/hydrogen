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
    customData: {
      entities: "&quot; &#34; &#x22; &amp;",
      injection:
        "x&quot;},&quot;shop&quot;:{&quot;shopId&quot;:&quot;gid://shopify/Shop/666&quot;},&quot;z&quot;:{&quot;a&quot;:&quot;",
      value: `"<&</script><script>throw new Error('injected')</script>\u2028\u2029`,
    },
  },
};

function parseInlineScripts(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  return [...document.querySelectorAll<HTMLScriptElement>("script:not([src])")];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.Shopify;
  Reflect.deleteProperty(window, Symbol.for("shopify.hydrogen.global.initialized"));
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

function runGlobalBootstrap(config: ShopifyScriptTagsOptions) {
  const script = parseInlineScripts(renderShopifyScriptTags(config).join("\n")).find(
    (candidate) => candidate.id === "shopify-global-bootstrap",
  );
  assert(script, "Expected the inline global bootstrap");
  vi.spyOn(document, "currentScript", "get").mockReturnValue(script);
  // oxlint-disable-next-line no-eval -- Execute the emitted bootstrap with its parsed configuration.
  (0, eval)(script.textContent);
}

it.each(["same", "different"])(
  "preserves initialized configuration and runtime state when rerun with %s configuration",
  (configuration) => {
    runGlobalBootstrap(options);
    const shopify = window.Shopify;
    assert(shopify, "Expected the global bootstrap to initialize Shopify");
    const { customerPrivacy, routes, components } = shopify;
    const analyticsProcessingAllowed = vi.fn(() => true);
    const navigate = vi.fn();
    Object.assign(customerPrivacy, { consentStatus: "loaded", analyticsProcessingAllowed });
    Object.assign(routes, { navigate });

    runGlobalBootstrap(
      configuration === "same"
        ? options
        : {
            ...options,
            shop: { ...shop, myshopifyDomain: "two.myshopify.com" },
            i18n: { country: "US", language: "EN", pathPrefix: "/en-us" },
          },
    );

    expect(window.Shopify).toBe(shopify);
    expect(shopify.shop).toBe(shop.myshopifyDomain);
    expect(shopify.country).toBe("CA");
    expect(shopify.locale).toBe("fr");
    expect(shopify.customerPrivacy).toBe(customerPrivacy);
    expect(shopify.customerPrivacy.consentStatus).toBe("loaded");
    expect(shopify.customerPrivacy.analyticsProcessingAllowed).toBe(analyticsProcessingAllowed);
    expect(shopify.routes).toBe(routes);
    expect(shopify.routes.navigate).toBe(navigate);
    expect(shopify.components).toBe(components);
  },
);

it("keeps the initialization marker separate from named HTML elements", () => {
  const form = document.createElement("form");
  const control = document.createElement("input");
  control.name = "shopify.hydrogen.global.initialized";
  form.append(control);
  // Named string properties cannot shadow the symbol marker.
  Object.defineProperty(form, control.name, { value: control });
  Object.defineProperty(window, "Shopify", { value: form, writable: true, configurable: true });
  vi.stubGlobal(control.name, control);

  runGlobalBootstrap(options);

  expect(window.Shopify?.shop).toBe(shop.myshopifyDomain);
  expect(window.Shopify?.country).toBe("CA");
  expect(Reflect.get(form, control.name)).toBe(control);
  expect(Reflect.get(window, control.name)).toBe(control);
  expect(Reflect.get(window, Symbol.for(control.name))).toBe(true);
});

it("marks initialization complete only after a successful run", () => {
  const existing = { customIntegration: {} };
  Object.defineProperty(existing, "shop", {
    configurable: true,
    set() {
      throw new Error("Unable to configure shop");
    },
  });
  Object.defineProperty(window, "Shopify", { value: existing, writable: true, configurable: true });

  expect(() => runGlobalBootstrap(options)).toThrow("Unable to configure shop");
  expect(Reflect.get(window, Symbol.for("shopify.hydrogen.global.initialized"))).toBeUndefined();
  Reflect.deleteProperty(existing, "shop");

  runGlobalBootstrap(options);

  expect(window.Shopify).toBe(existing);
  expect(window.Shopify?.shop).toBe(shop.myshopifyDomain);
  expect(Reflect.get(existing, "customIntegration")).toBe(existing.customIntegration);
  expect(Reflect.get(window, Symbol.for("shopify.hydrogen.global.initialized"))).toBe(true);
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

it.each(["html", "react", "vue", "quote-only attributes"] as const)(
  "preserves script bytes and escaped configuration through %s rendering",
  async (renderer) => {
    const html =
      renderer === "react"
        ? renderToStaticMarkup(createElement(ReactShopifyScripts, options))
        : renderer === "vue"
          ? await renderToString(h(VueShopifyScripts, options))
          : renderer === "quote-only attributes"
            ? getShopifyScriptTags(options)
                .scripts.map((script) => {
                  // Unhead escapes attribute quotes but leaves ampersands unchanged.
                  const attributes = Object.entries(script.attributes ?? {})
                    .map(([name, value]) => `${name}="${String(value).replace(/"/g, "&quot;")}"`)
                    .join(" ");
                  return `<script ${attributes}>${script.innerHTML ?? ""}</script>`;
                })
                .join("\n")
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
