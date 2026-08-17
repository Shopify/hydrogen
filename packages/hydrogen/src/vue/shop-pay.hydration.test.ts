// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";

import {
  getShopPayButtonElementAttributes,
  getShopPayButtonElementContentHtml,
} from "../core/shop-pay/shop-pay";
import { assert } from "../core/test-utils";
import { ShopPayButton } from "./shop-pay";

describe("ShopPayButton hydration", () => {
  it("preserves the server-rendered shadow root without hydration warnings", async () => {
    const options = { variants: [{ id: "123", quantity: 2 }] };
    const container = document.createElement("div");
    const element = document.createElement("hydrogen-shop-pay-button");
    for (const [name, value] of Object.entries(getShopPayButtonElementAttributes(options))) {
      element.setAttribute(name, value);
    }
    element.attachShadow({ mode: "open" }).innerHTML = getShopPayButtonElementContentHtml(options);
    container.append(element);
    document.body.append(container);

    const shadowRoot = element.shadowRoot;
    const anchor = shadowRoot?.querySelector("a");
    assert(shadowRoot, "expected a server-rendered shadow root");
    assert(anchor, "expected a server-rendered shadow anchor");
    const warnHandler = vi.fn();
    const app = createSSRApp({ render: () => h(ShopPayButton, options) });
    app.config.warnHandler = warnHandler;

    app.mount(container);
    await nextTick();

    expect(element.shadowRoot).toBe(shadowRoot);
    expect(shadowRoot.querySelector("a")).toBe(anchor);
    expect(warnHandler).not.toHaveBeenCalled();

    app.unmount();
    container.remove();
  });
});
