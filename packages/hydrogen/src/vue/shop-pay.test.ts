// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import { assert } from "../core/test-utils";
import { ShopPayButton } from "./shop-pay";

describe("ShopPayButton", () => {
  it("renders an anchor with a same-origin cart permalink", () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        variants: ["gid://shopify/ProductVariant/123"],
        channel: "headless",
        width: "100%",
      },
      attrs: {
        class: "extra",
      },
    });

    const anchor = wrapper.find("a").element;
    expect(anchor.getAttribute("href")).toBe(
      "/cart/123:1?payment=shop_pay&source=hydrogen&channel=headless",
    );
    expect(anchor.className).toBe("shop-pay-button extra");
    expect(anchor.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");
  });

  it("renders a same-origin checkout URL without variants", () => {
    const wrapper = mount(ShopPayButton);

    expect(wrapper.find("a").element.getAttribute("href")).toBe(
      "/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("renders the accessible label, logo, and styles", () => {
    const wrapper = mount(ShopPayButton, { props: { locale: "de" } });

    const label = wrapper.find(".shop-pay-button__label");
    expect(label.text()).toBe("Mit Shop Pay kaufen");
    expect(wrapper.find("svg.shop-pay-button__logo").exists()).toBe(true);
    expect(wrapper.find("style").exists()).toBe(true);
  });

  it("renders a disabled button without an href", () => {
    const wrapper = mount(ShopPayButton, { props: { disabled: true } });

    const anchor = wrapper.find("a").element;
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("updates the permalink when variants change", async () => {
    const wrapper = mount(ShopPayButton, {
      props: { variants: [{ id: "123", quantity: 1 }] },
    });

    await wrapper.setProps({ variants: [{ id: "456", quantity: 3 }] });

    expect(wrapper.find("a").element.getAttribute("href")).toBe(
      "/cart/456:3?payment=shop_pay&source=hydrogen",
    );
  });

  it("renders a working button during SSR with no client JavaScript", async () => {
    const html = await renderToString(
      h(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        paymentOption: "shop_pay_installments",
      }),
    );

    assert(html, "expected SSR output");
    expect(html).toContain('href="/cart/123:2?payment=shop_pay_installments&amp;source=hydrogen"');
    expect(html).toContain("shop-pay-button__label");
    expect(html).toContain("<style>");
  });
});
