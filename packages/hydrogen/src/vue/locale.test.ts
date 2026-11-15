// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, type PropType } from "vue";

import type { ShopifyMatchedLocale } from "../core/i18n/types";
import { configureLogging } from "../core/logging";
import { createTestLogger } from "../core/test-utils";
import { LocaleProvider, useLocale } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;

const CollectionsLink = defineComponent({
  setup() {
    const locale = useLocale();
    return () => h("a", { href: `${locale.value.pathPrefix}/collections` });
  },
});

const App = defineComponent({
  props: { locale: { type: Object as PropType<ShopifyMatchedLocale>, required: true } },
  setup(props) {
    return () => h(LocaleProvider, { locale: props.locale }, () => h(CollectionsLink));
  },
});

afterEach(() => {
  configureLogging({});
  delete (window as { Shopify?: unknown }).Shopify;
});

describe("useLocale", () => {
  it("returns the locale from the provider and follows a locale change", async () => {
    const wrapper = mount(App, { props: { locale: FR_CA } });
    expect(wrapper.get("a").attributes("href")).toBe("/fr-ca/collections");

    await wrapper.setProps({ locale: EN_CA });

    expect(wrapper.get("a").attributes("href")).toBe("/en-ca/collections");
  });

  it("throws outside the provider", () => {
    expect(() => mount(CollectionsLink)).toThrow(
      "useLocale must be used inside a <LocaleProvider>.",
    );
  });
});

describe("LocaleProvider", () => {
  it("warns in development when its locale differs from the locale of the page", () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    (window as { Shopify?: unknown }).Shopify = { routes: { root: "/fr-ca/" } };

    mount(App, { props: { locale: EN_CA } });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"/en-ca"'), {
      scope: "i18n",
    });
  });
});
