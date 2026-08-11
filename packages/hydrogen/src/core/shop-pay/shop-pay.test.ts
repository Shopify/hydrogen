// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { configureLogging, resetLoggingForTests } from "../logging";
import { assert, createTestLogger } from "../test-utils";
import {
  createShopPayButton,
  defineShopPayButton,
  getShopPayButtonElementContentHtml,
  getShopPayButtonUrl,
  renderShopPayButton,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "./shop-pay";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  resetLoggingForTests();
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

describe("renderShopPayButton", () => {
  function renderToElement(options: ShopPayButtonOptions): HTMLElement {
    document.body.innerHTML = renderShopPayButton(options);
    const anchor = document.body.querySelector("a");
    assert(anchor, "expected renderShopPayButton to render an anchor");
    return anchor;
  }

  it("renders a zero-JS anchor with the checkout URL", () => {
    const anchor = renderToElement({ variants: ["123"] });

    expect(document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME)).not.toBeNull();
    expect(anchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(anchor.getAttribute("class")).toBe("shop-pay-button");
  });

  it("renders the default accessible label and the Shop Pay logo", () => {
    const anchor = renderToElement({});

    expect(anchor.getAttribute("aria-label")).toBe("Buy with Shop Pay");

    const logo = anchor.querySelector("svg.shop-pay-button__logo");
    assert(logo, "expected the Shop Pay logo");
    expect(logo.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders a caller-provided localized accessible label", () => {
    const anchor = renderToElement({ accessibilityLabel: "Shop Pay से खरीदें" });

    expect(anchor.getAttribute("aria-label")).toBe("Shop Pay से खरीदें");
  });

  it("falls back to the default accessible label for blank labels", () => {
    const anchor = renderToElement({ accessibilityLabel: " " });

    expect(anchor.getAttribute("aria-label")).toBe("Buy with Shop Pay");
  });

  it("renders escaped custom button text instead of the logo", () => {
    const anchor = renderToElement({ buttonText: "Pay <fast> & easy" });

    expect(anchor.querySelector("svg")).toBeNull();
    const text = anchor.querySelector(".shop-pay-button__text");
    assert(text, "expected visible button text");
    expect(text.textContent).toBe("Pay <fast> & easy");
    expect(anchor.hasAttribute("aria-label")).toBe(false);
  });

  it("uses accessibilityLabel as the accessible name when custom button text is present", () => {
    const anchor = renderToElement({
      accessibilityLabel: "Shop Payで購入",
      buttonText: "Shop Pay",
    });

    expect(anchor.getAttribute("aria-label")).toBe("Shop Payで購入");
  });

  it("treats blank custom button text as absent", () => {
    const anchor = renderToElement({ buttonText: " " });

    expect(anchor.querySelector("svg.shop-pay-button__logo")).not.toBeNull();
    expect(anchor.querySelector(".shop-pay-button__text")).toBeNull();
    expect(anchor.getAttribute("aria-label")).toBe("Buy with Shop Pay");
  });

  it("renders a disabled button without an href", () => {
    const anchor = renderToElement({ disabled: true });

    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("maps width and borderRadius to direct anchor styles", () => {
    const anchor = renderToElement({ width: "100%", borderRadius: "6px" });

    expect(anchor.style.width).toBe("100%");
    expect(anchor.style.borderRadius).toBe("6px");
  });

  it("carries the button styles for zero-JS rendering", () => {
    const html = renderShopPayButton({});

    expect(html).toContain("<hydrogen-shop-pay-button>");
    expect(html).toContain("<style>");
    expect(html).toContain("background-color:#5433eb");
    expect(html).not.toContain("--shop-pay-button");
    expect(html).not.toContain("--buttons-radius");
  });
});

describe("createShopPayButton", () => {
  it("creates the self-contained custom element", () => {
    const first = createShopPayButton({ variants: ["123"] });
    const second = createShopPayButton({});
    const firstAnchor = first.querySelector("a");
    const secondAnchor = second.querySelector("a");

    assert(firstAnchor, "expected first element to contain an anchor");
    assert(secondAnchor, "expected second element to contain an anchor");
    expect(first.tagName.toLowerCase()).toBe(SHOP_PAY_BUTTON_TAG_NAME);
    expect(first.querySelector("style")?.textContent).toContain("background-color:#5433eb");
    expect(firstAnchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(secondAnchor.getAttribute("href")).toBe("/checkout?payment=shop_pay&source=hydrogen");
    expect(document.head.querySelectorAll("style")).toHaveLength(0);
  });
});

describe("defineShopPayButton", () => {
  it("registers the custom element once and renders from attributes", () => {
    defineShopPayButton();
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("accessibility-label", "Shop Payで購入");
    element.setAttribute("variants", "123:2,456:1");
    element.setAttribute("payment-option", "shop_pay_installments");
    document.body.append(element);

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to render an anchor");
    expect(anchor.getAttribute("href")).toBe(
      "/cart/123:2,456:1?payment=shop_pay_installments&source=hydrogen",
    );
    expect(anchor.getAttribute("aria-label")).toBe("Shop Payで購入");
  });

  it("re-renders when observed attributes change", () => {
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("variants", "123:1");
    document.body.append(element);
    const firstAnchor = element.querySelector("a");
    assert(firstAnchor, "expected the element to render an anchor");

    element.setAttribute("variants", "456:3");
    element.setAttribute("disabled", "");

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to render an anchor");
    expect(anchor).toBe(firstAnchor);
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");

    element.removeAttribute("disabled");
    const enabledAnchor = element.querySelector("a");
    assert(enabledAnchor, "expected the element to re-render an anchor");
    expect(enabledAnchor.getAttribute("href")).toBe("/cart/456:3?payment=shop_pay&source=hydrogen");
  });

  it("preserves focus when a managed custom element updates", () => {
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("variants", "123:1");
    document.body.append(element);

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to render an anchor");
    anchor.focus();

    element.setAttribute("width", "100%");

    expect(element.querySelector("a")).toBe(anchor);
    expect(document.activeElement).toBe(anchor);
    expect(anchor.style.width).toBe("100%");
  });

  it("does not clobber framework-rendered children when the element is defined", () => {
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.innerHTML = getShopPayButtonElementContentHtml({
      accessibilityLabel: "Shop Payで購入",
      disabled: true,
      variants: ["123"],
    });
    document.body.append(element);

    const anchor = element.querySelector("a");
    assert(anchor, "expected the element to keep its existing anchor");
    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
    expect(anchor.getAttribute("aria-label")).toBe("Shop Payで購入");
  });

  it("updates server-rendered managed elements in place after upgrade", () => {
    defineShopPayButton();

    document.body.innerHTML = renderShopPayButton({ variants: ["123"] });
    const element = document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME);
    assert(element, "expected renderShopPayButton to render an element");
    const firstAnchor = element.querySelector("a");
    assert(firstAnchor, "expected the element to contain an anchor");

    element.setAttribute("variants", "456:2");

    const updatedAnchor = element.querySelector("a");
    assert(updatedAnchor, "expected the element to keep an anchor");
    expect(updatedAnchor).toBe(firstAnchor);
    expect(updatedAnchor.getAttribute("href")).toBe("/cart/456:2?payment=shop_pay&source=hydrogen");
  });

  it("logs instead of throwing when attributes are invalid", () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    defineShopPayButton();

    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.setAttribute("variants", "123:invalid");
    document.body.append(element);

    expect(logger.error).toHaveBeenCalledWith("shop-pay button render failed", {
      scope: "shop-pay",
      error: expect.objectContaining({ message: expect.stringMatching(/positive integers/) }),
    });
  });
});
