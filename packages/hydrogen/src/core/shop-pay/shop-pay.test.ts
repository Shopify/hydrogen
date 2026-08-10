// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { assert } from "../test-utils";
import { getShopPayButtonLabel } from "./labels";
import {
  createShopPayButton,
  defineShopPayButton,
  getShopPayButtonUrl,
  renderShopPayButton,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "./shop-pay";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("getShopPayButtonUrl", () => {
  it("builds a same-origin checkout URL by default", () => {
    expect(getShopPayButtonUrl({})).toBe("/checkout?payment=shop_pay&source=hydrogen");
  });

  it("builds a same-origin cart permalink for variant mode", () => {
    expect(
      getShopPayButtonUrl({
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }, { id: "456" }],
        paymentOption: "shop_pay_installments",
        channel: "headless",
      }),
    ).toBe("/cart/123:2,456:1?payment=shop_pay_installments&source=hydrogen&channel=headless");
  });

  it("normalizes Shopify ProductVariant GIDs and defaults quantities to one", () => {
    expect(getShopPayButtonUrl({ variants: ["gid://shopify/ProductVariant/123", "456"] })).toBe(
      "/cart/123:1,456:1?payment=shop_pay&source=hydrogen",
    );
  });

  it("appends supported attribution params", () => {
    expect(
      getShopPayButtonUrl({
        source: "custom-source",
        sourceToken: "token-1",
        channel: "headless",
      }),
    ).toBe("/checkout?payment=shop_pay&source=custom-source&source_token=token-1&channel=headless");
  });

  it("returns null when disabled", () => {
    expect(getShopPayButtonUrl({ disabled: true, variants: ["123"] })).toBeNull();
  });

  it("uses the exact checkout URL for checkout mode", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "https://example.myshopify.com/checkouts/cn/abc?key=value",
      }),
    ).toBe(
      "https://example.myshopify.com/checkouts/cn/abc?key=value&payment=shop_pay&source=hydrogen",
    );
  });

  it("builds an absolute cart permalink for variant mode with a checkout URL", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "https://example.myshopify.com/checkouts/cn/abc?key=value",
        variants: ["gid://shopify/ProductVariant/123", "456"],
      }),
    ).toBe(
      "https://example.myshopify.com/cart/123:1,456:1?key=value&payment=shop_pay&source=hydrogen",
    );
  });

  it("uses /checkout when only a store domain is provided", () => {
    expect(getShopPayButtonUrl({ checkoutUrl: "example.myshopify.com" })).toBe(
      "https://example.myshopify.com/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("preserves checkout URL params while letting Shop Pay params override them", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com?discount=SAVE10&payment=bogus#ignored",
      }),
    ).toBe(
      "https://example.myshopify.com/checkout?discount=SAVE10&payment=shop_pay&source=hydrogen",
    );
  });

  it("throws when checkoutUrl is empty", () => {
    expect(() => getShopPayButtonUrl({ checkoutUrl: " " })).toThrow(/checkoutUrl/);
  });

  it("throws for mixed variant shapes", () => {
    expect(() =>
      getShopPayButtonUrl({
        variants: ["123", { id: "456", quantity: 2 }],
      } as unknown as ShopPayButtonOptions),
    ).toThrow(/either variant IDs or objects/);
  });

  it("throws for non-variant GIDs", () => {
    expect(() => getShopPayButtonUrl({ variants: ["gid://shopify/Product/123"] })).toThrow(
      /ProductVariant/,
    );
  });

  it("throws for invalid quantities", () => {
    expect(() => getShopPayButtonUrl({ variants: [{ id: "123", quantity: 0 }] })).toThrow(
      /positive integers/,
    );
  });
});

describe("getShopPayButtonLabel", () => {
  it("defaults to English", () => {
    expect(getShopPayButtonLabel()).toBe("Buy with Shop Pay");
  });

  it("matches exact locales case-insensitively", () => {
    expect(getShopPayButtonLabel("PT-br")).toBe("Comprar com Shop Pay");
  });

  it("matches base languages ignoring unknown regions", () => {
    expect(getShopPayButtonLabel("fr-CA")).toBe("Acheter avec Shop Pay");
  });

  it("falls back to the first regional variant of a base language", () => {
    expect(getShopPayButtonLabel("pt")).toBe("Comprar com o Shop Pay");
  });

  it("falls back to English for unknown locales", () => {
    expect(getShopPayButtonLabel("xx-XX")).toBe("Buy with Shop Pay");
  });
});

describe("renderShopPayButton", () => {
  function renderToElement(options: ShopPayButtonOptions): HTMLElement {
    document.body.innerHTML = renderShopPayButton(options);
    const anchor = document.body.querySelector("a");
    assert(anchor, "expected renderShopPayButton to render an anchor");
    return anchor;
  }

  it("renders a zero-JS anchor with the checkout URL", () => {
    const anchor = renderToElement({ variants: ["123"] });

    expect(anchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(anchor.getAttribute("class")).toBe("shop-pay-button");
  });

  it("renders the localized accessible label and the Shop Pay logo", () => {
    const anchor = renderToElement({ locale: "fr" });

    const label = anchor.querySelector(".shop-pay-button__label");
    assert(label, "expected an accessible label");
    expect(label.textContent).toBe("Acheter avec Shop Pay");

    const logo = anchor.querySelector("svg.shop-pay-button__logo");
    assert(logo, "expected the Shop Pay logo");
    expect(logo.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders escaped custom button text instead of the logo", () => {
    const anchor = renderToElement({ buttonText: "Pay <fast> & easy" });

    expect(anchor.querySelector("svg")).toBeNull();
    const text = anchor.querySelector(".shop-pay-button__text");
    assert(text, "expected visible button text");
    expect(text.textContent).toBe("Pay <fast> & easy");
    expect(anchor.querySelector(".shop-pay-button__label")).not.toBeNull();
  });

  it("renders a disabled button without an href", () => {
    const anchor = renderToElement({ disabled: true });

    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("maps width and borderRadius to shop-js CSS custom properties", () => {
    const anchor = renderToElement({ width: "100%", borderRadius: "6px" });

    expect(anchor.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");
    expect(anchor.style.getPropertyValue("--shop-pay-button-border-radius")).toBe("6px");
  });

  it("includes the button styles for zero-JS rendering", () => {
    const html = renderShopPayButton({});

    expect(html).toContain("<style>");
    expect(html).toContain(".shop-pay-button{");
  });
});

describe("createShopPayButton", () => {
  it("creates the anchor element and injects the styles once", () => {
    const first = createShopPayButton({ variants: ["123"] });
    const second = createShopPayButton({});

    expect(first.tagName.toLowerCase()).toBe("a");
    expect(first.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(second.getAttribute("href")).toBe("/checkout?payment=shop_pay&source=hydrogen");
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });
});

describe("defineShopPayButton", () => {
  it("registers the custom element once and renders from attributes", () => {
    defineShopPayButton();
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("variants", "123:2,456:1");
    element.setAttribute("payment-option", "shop_pay_installments");
    document.body.append(element);

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to render an anchor");
    expect(anchor.getAttribute("href")).toBe(
      "/cart/123:2,456:1?payment=shop_pay_installments&source=hydrogen",
    );
  });

  it("re-renders when observed attributes change", () => {
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("variants", "123:1");
    document.body.append(element);

    element.setAttribute("variants", "456:3");
    element.setAttribute("disabled", "");

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to render an anchor");
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");

    element.removeAttribute("disabled");
    const enabledAnchor = element.querySelector("a");
    assert(enabledAnchor, "expected the element to re-render an anchor");
    expect(enabledAnchor.getAttribute("href")).toBe("/cart/456:3?payment=shop_pay&source=hydrogen");
  });
});
