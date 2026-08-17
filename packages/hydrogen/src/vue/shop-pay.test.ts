// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { assert } from "../core/test-utils";
import { ShopPayButton } from "./shop-pay";

describe("ShopPayButton", () => {
  function getAnchor(wrapper: ReturnType<typeof mount>): HTMLAnchorElement {
    const element = wrapper.find("hydrogen-shop-pay-button").element;
    const anchor = element.shadowRoot?.querySelector("a");
    assert(anchor, "expected a shadow anchor");
    return anchor;
  }

  it("renders an anchor with a same-origin cart permalink", () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        variants: ["gid://shopify/ProductVariant/123"],
        width: "100%",
      },
      attrs: {
        class: "extra",
      },
    });

    const anchor = getAnchor(wrapper);
    expect(wrapper.find("hydrogen-shop-pay-button").attributes("class")).toBeUndefined();
    expect(anchor.classList.contains("extra")).toBe(false);
    expect(anchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(anchor.className).toBe("shop-pay-button");
    expect(anchor.style.width).toBe("100%");
  });

  it("renders a same-origin checkout URL without variants", () => {
    const wrapper = mount(ShopPayButton);

    expect(getAnchor(wrapper).getAttribute("href")).toBe(
      "/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("renders the accessible label, logo, and styles", () => {
    const wrapper = mount(ShopPayButton, {
      props: { accessibilityLabel: "Shop Pay से खरीदें", nonce: "nonce-1" },
    });

    const anchor = getAnchor(wrapper);
    expect(anchor.getAttribute("aria-label")).toBe("Shop Pay से खरीदें");
    expect(anchor.querySelector("svg.shop-pay-button__logo")).not.toBeNull();
    const shadowRoot = anchor.getRootNode();
    if (!(shadowRoot instanceof ShadowRoot)) throw new Error("expected a shadow root");
    expect(shadowRoot.querySelector("style")?.nonce).toBe("nonce-1");
    expect(customElements.get("hydrogen-shop-pay-button")).toBeUndefined();
  });

  it("renders a disabled button without an href", () => {
    const wrapper = mount(ShopPayButton, { props: { disabled: true } });

    const anchor = getAnchor(wrapper);
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("role")).toBe("link");
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("casts a bare disabled prop to true", () => {
    const wrapper = mount({
      components: { ShopPayButton },
      template: "<ShopPayButton disabled />",
    });

    const anchor = getAnchor(wrapper);
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("role")).toBe("link");
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("updates the permalink when variants change", async () => {
    const wrapper = mount(ShopPayButton, {
      props: { variants: [{ id: "123", quantity: 1 }] },
    });
    expect(getAnchor(wrapper).getAttribute("href")).toBe(
      "/cart/123:1?payment=shop_pay&source=hydrogen",
    );

    await wrapper.setProps({ variants: [{ id: "456", quantity: 3 }] });

    expect(getAnchor(wrapper).getAttribute("href")).toBe(
      "/cart/456:3?payment=shop_pay&source=hydrogen",
    );
  });
});
