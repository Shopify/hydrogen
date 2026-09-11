// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getShopPayButtonElementAttributes,
  getShopPayButtonElementContentHtml,
} from "../core/shop-pay/shop-pay";
import { assert } from "../core/test-utils";
import { ShopPayButton } from "./shop-pay";

afterEach(() => vi.restoreAllMocks());

describe("ShopPayButton hydration", () => {
  it("preserves the server-rendered shadow root without hydration errors", async () => {
    const options = { variants: [{ id: "123", quantity: 2 }], nonce: "nonce-1" };
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
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(container, createElement(ShopPayButton, options), {
        onRecoverableError,
      });
    });

    expect(element.shadowRoot).toBe(shadowRoot);
    expect(shadowRoot.querySelector("a")).toBe(anchor);
    expect(shadowRoot.querySelector("style")?.nonce).toBe("nonce-1");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
    container.remove();
  });
});
