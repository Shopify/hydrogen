// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { assert } from "../core/test-utils";
import { ShopPayButton, type ShopPayButtonProps } from "./shop-pay";

describe("ShopPayButton", () => {
  it("exposes only supported styling props", () => {
    expectTypeOf<"width" extends keyof ShopPayButtonProps ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<
      "borderRadius" extends keyof ShopPayButtonProps ? true : false
    >().toEqualTypeOf<true>();
    expectTypeOf<"nonce" extends keyof ShopPayButtonProps ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<
      "className" extends keyof ShopPayButtonProps ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<"style" extends keyof ShopPayButtonProps ? true : false>().toEqualTypeOf<false>();
  });

  function getAnchor(container: HTMLElement): HTMLAnchorElement {
    const element = container.querySelector("hydrogen-shop-pay-button");
    assert(element, "expected a Shop Pay host element");
    const anchor = element.shadowRoot?.querySelector("a");
    assert(anchor, "expected a shadow anchor");
    return anchor;
  }

  it("renders an anchor with a same-origin cart permalink", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        width: "100%",
      }),
    );

    const anchor = getAnchor(container);
    expect(anchor.getAttribute("href")).toBe("/cart/123:2?payment=shop_pay&source=hydrogen");
    expect(anchor.className).toBe("shop-pay-button");
    expect(anchor.style.width).toBe("100%");
  });

  it("renders a same-origin checkout URL without variants", () => {
    const { container } = render(createElement(ShopPayButton, {}));

    const anchor = getAnchor(container);
    expect(anchor.getAttribute("href")).toBe("/checkout?payment=shop_pay&source=hydrogen");
  });

  it("renders the accessible label, logo, and styles", () => {
    const { container } = render(
      createElement(ShopPayButton, { accessibilityLabel: "Shop Payで購入", nonce: "nonce-1" }),
    );

    const anchor = getAnchor(container);
    expect(anchor.getAttribute("aria-label")).toBe("Shop Payで購入");
    expect(anchor.querySelector("svg.shop-pay-button__logo")).not.toBeNull();
    const shadowRoot = anchor.getRootNode();
    if (!(shadowRoot instanceof ShadowRoot)) throw new Error("expected a shadow root");
    expect(shadowRoot.querySelector("style")?.nonce).toBe("nonce-1");
    expect(customElements.get("hydrogen-shop-pay-button")).toBeUndefined();
  });

  it("maps borderRadius to the anchor style", () => {
    const { container } = render(createElement(ShopPayButton, { borderRadius: "6px" }));

    const anchor = getAnchor(container);
    expect(anchor.className).toBe("shop-pay-button");
    expect(anchor.style.borderRadius).toBe("6px");
  });

  it("renders a disabled button without an href", () => {
    const { container } = render(createElement(ShopPayButton, { disabled: true }));

    const anchor = getAnchor(container);
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("role")).toBe("link");
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("does not require CartProvider", () => {
    const { container } = render(createElement(ShopPayButton, {}));

    expect(getAnchor(container).className).toBe("shop-pay-button");
  });

  it("updates the shadow anchor when props change", () => {
    const { container, rerender } = render(
      createElement(ShopPayButton, { variants: [{ id: "123", quantity: 1 }] }),
    );
    const initialAnchor = getAnchor(container);
    expect(initialAnchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(initialAnchor.style.width).toBe("");

    rerender(
      createElement(ShopPayButton, {
        variants: [{ id: "456", quantity: 3 }],
        width: "100%",
      }),
    );

    const anchor = getAnchor(container);
    expect(anchor.getAttribute("href")).toBe("/cart/456:3?payment=shop_pay&source=hydrogen");
    expect(anchor.style.width).toBe("100%");
  });
});
