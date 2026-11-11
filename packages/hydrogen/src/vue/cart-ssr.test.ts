// @vitest-environment node
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import type { ShopifyMatchedLocale } from "../core/i18n/types";
import { CartProvider, useCartForm } from "./cart";
import { LocaleProvider } from "./locale";

const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;

function startRequest(locale: ShopifyMatchedLocale) {
  let finishLoading: (() => void) | undefined;
  const loading = new Promise<void>((resolve) => {
    finishLoading = resolve;
  });
  // Renders its form only after the test lets it, once every request has started rendering.
  const DeferredCartForm = defineComponent({
    async setup() {
      const { formProps } = useCartForm();
      await loading;
      return () => h("form", formProps());
    },
  });
  const html = renderToString(
    h(LocaleProvider, { locale }, () => h(CartProvider, null, () => h(DeferredCartForm))),
  );
  return { html, finishLoading: () => finishLoading?.() };
}

function getFormActions(html: string): string[] {
  return [...html.matchAll(/action="([^"]*)"/g)].map(([, action]) => action);
}

describe("cart form actions in server renders", () => {
  it("renders each request's own action when requests for two locales overlap", async () => {
    const frCa = startRequest(FR_CA);
    const enCa = startRequest(EN_CA);

    enCa.finishLoading();
    frCa.finishLoading();

    expect(getFormActions(await frCa.html)).toEqual(["/fr-ca/api/cart"]);
    expect(getFormActions(await enCa.html)).toEqual(["/en-ca/api/cart"]);
  });
});
