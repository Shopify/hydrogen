// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { assert } from "../core/test-utils";
import { ShopPayButton } from "./shop-pay";

describe("ShopPayButton", () => {
  it("renders an anchor with a same-origin cart permalink", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        channel: "headless",
        width: "100%",
      }),
    );

    const anchor = container.querySelector("a");
    assert(anchor, "expected an anchor");
    expect(anchor.getAttribute("href")).toBe(
      "/cart/123:2?payment=shop_pay&source=hydrogen&channel=headless",
    );
    expect(anchor.className).toBe("shop-pay-button");
    expect(anchor.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");
  });

  it("renders a same-origin checkout URL without variants", () => {
    const { container } = render(createElement(ShopPayButton, {}));

    const anchor = container.querySelector("a");
    assert(anchor, "expected an anchor");
    expect(anchor.getAttribute("href")).toBe("/checkout?payment=shop_pay&source=hydrogen");
  });

  it("renders the accessible label, logo, and styles", () => {
    const { container } = render(createElement(ShopPayButton, { locale: "de" }));

    const label = container.querySelector(".shop-pay-button__label");
    assert(label, "expected the accessible label");
    expect(label.textContent).toBe("Mit Shop Pay kaufen");
    expect(container.querySelector("svg.shop-pay-button__logo")).not.toBeNull();
    expect(container.querySelector("style")).not.toBeNull();
  });

  it("merges className and style with the button defaults", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        className: "extra",
        style: { marginTop: "4px" },
        borderRadius: "6px",
      }),
    );

    const anchor = container.querySelector("a");
    assert(anchor, "expected an anchor");
    expect(anchor.className).toBe("shop-pay-button extra");
    expect(anchor.style.marginTop).toBe("4px");
    expect(anchor.style.getPropertyValue("--shop-pay-button-border-radius")).toBe("6px");
  });

  it("renders a disabled button without an href", () => {
    const { container } = render(createElement(ShopPayButton, { disabled: true }));

    const anchor = container.querySelector("a");
    assert(anchor, "expected an anchor");
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("does not require CartProvider", () => {
    const { container } = render(createElement(ShopPayButton, {}));

    expect(container.querySelector("a.shop-pay-button")).not.toBeNull();
  });

  it("renders a working button during SSR with no client JavaScript", () => {
    const html = renderToString(
      createElement(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        paymentOption: "shop_pay_installments",
      }),
    );

    expect(html).toContain('href="/cart/123:2?payment=shop_pay_installments&amp;source=hydrogen"');
    expect(html).toContain("shop-pay-button__label");
    expect(html).toContain(".shop-pay-button[aria-disabled=true]{opacity:.5");
  });
});
