// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { assert } from "../test-utils";
import {
  createShopPayButton,
  getShopPayButtonUrl,
  initializeShopPayButtonElement,
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
      }),
    ).toBe("/cart/123:2,456:1?payment=shop_pay_installments&source=hydrogen");
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
    const element = document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME);
    assert(element, "expected renderShopPayButton to render a host element");
    const anchor = element.shadowRoot?.querySelector("a");
    assert(anchor, "expected renderShopPayButton to render an anchor");
    return anchor;
  }

  it("renders a zero-JS anchor with the checkout URL", () => {
    const anchor = renderToElement({ variants: ["123"] });

    expect(document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME)).not.toBeNull();
    expect(anchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(anchor.getAttribute("class")).toBe("shop-pay-button");
    expect(anchor.getAttribute("target")).toBe("_self");
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

  it("renders a disabled button without an href", () => {
    const anchor = renderToElement({ disabled: true });

    expect(anchor.hasAttribute("href")).toBe(false);
    expect(anchor.getAttribute("role")).toBe("link");
    expect(anchor.getAttribute("aria-disabled")).toBe("true");
  });

  it("maps width and borderRadius to direct anchor styles", () => {
    const anchor = renderToElement({ width: "100%", borderRadius: "6px" });

    expect(anchor.style.width).toBe("100%");
    expect(anchor.style.borderRadius).toBe("6px");
  });

  it("encapsulates the button styles in the shadow root", () => {
    const anchor = renderToElement({});
    const shadowRoot = anchor.getRootNode();
    if (!(shadowRoot instanceof ShadowRoot)) throw new Error("expected a shadow root");

    expect(shadowRoot.querySelector("style")?.textContent).toContain(":host{display:block}");
    expect(shadowRoot.querySelector("style")?.textContent).toContain("background-color:#5433eb");
    expect(shadowRoot.textContent).not.toContain("--shop-pay-button");
    expect(shadowRoot.textContent).not.toContain("--buttons-radius");
    expect(shadowRoot.host.querySelector("style")).toBeNull();
  });

  it("updates the shadow tree when host attributes change", () => {
    document.body.innerHTML = renderShopPayButton({ variants: ["123"] });
    const element = document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME);
    assert(element, "expected a host element");
    const initialAnchor = element.shadowRoot?.querySelector("a");
    assert(initialAnchor, "expected an initial shadow anchor");
    expect(initialAnchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(initialAnchor.style.width).toBe("");

    element.setAttribute("variants", "456:3");
    element.setAttribute("width", "100%");
    element.setAttribute("channel", "headless");

    const anchor = element.shadowRoot?.querySelector("a");
    assert(anchor, "expected a shadow anchor");
    expect(anchor.getAttribute("href")).toBe(
      "/cart/456:3?payment=shop_pay&source=hydrogen&channel=headless",
    );
    expect(anchor.style.width).toBe("100%");
  });

  it("defaults invalid payment-option attributes to Shop Pay", () => {
    document.body.innerHTML = renderShopPayButton({});
    const element = document.body.querySelector(SHOP_PAY_BUTTON_TAG_NAME);
    assert(element, "expected a host element");

    element.setAttribute("payment-option", "bogus");

    expect(element.shadowRoot?.querySelector("a")?.getAttribute("href")).toBe(
      "/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("rejects extra CSS declarations in exposed style values", () => {
    expect(() => renderShopPayButton({ width: "100%;color:red" })).toThrow(/single CSS value/);
  });
});

describe("createShopPayButton", () => {
  it("creates the self-contained wrapper element", () => {
    const first = createShopPayButton({ variants: ["123"] });
    const second = createShopPayButton({});
    first.id = "shop-pay";
    first.dataset.testid = "shop-pay";
    document.body.append(first);
    const firstAnchor = first.shadowRoot?.querySelector("a");
    const secondAnchor = second.shadowRoot?.querySelector("a");

    assert(firstAnchor, "expected first element to contain an anchor");
    assert(secondAnchor, "expected second element to contain an anchor");
    expect(first.tagName.toLowerCase()).toBe(SHOP_PAY_BUTTON_TAG_NAME);
    expect(first.shadowRoot?.querySelector("style")?.textContent).toContain(
      "background-color:#5433eb",
    );
    expect(firstAnchor.getAttribute("href")).toBe("/cart/123:1?payment=shop_pay&source=hydrogen");
    expect(secondAnchor.getAttribute("href")).toBe("/checkout?payment=shop_pay&source=hydrogen");
    expect(first.id).toBe("shop-pay");
    expect(first.dataset.testid).toBe("shop-pay");
    expect(document.head.querySelectorAll("style")).toHaveLength(0);
  });

  it("applies a CSP nonce to client-created styles", () => {
    const element = createShopPayButton({ nonce: "nonce-1" });

    expect(element.getAttribute("nonce")).toBe("nonce-1");
    expect(element.shadowRoot?.querySelector("style")?.nonce).toBe("nonce-1");
  });

  it("reads a concealed CSP nonce from the host property", () => {
    const element = document.createElement(SHOP_PAY_BUTTON_TAG_NAME);
    element.nonce = "nonce-1";
    const getAttribute = element.getAttribute.bind(element);
    vi.spyOn(element, "getAttribute").mockImplementation((name) => {
      return name === "nonce" ? "" : getAttribute(name);
    });

    document.body.append(element);

    expect(element.shadowRoot?.querySelector("style")?.nonce).toBe("nonce-1");
  });

  it("re-applies styles after a CSP nonce is provided", () => {
    const element = createShopPayButton({});
    const style = element.shadowRoot?.querySelector("style");
    assert(style, "expected a shadow-root style");
    expect(style.nonce).toBeUndefined();

    initializeShopPayButtonElement(element, { nonce: "nonce-1" });

    expect(style.nonce).toBe("nonce-1");
    expect(style.textContent).toContain("background-color:#5433eb");
  });

  it("removes the CSP nonce when the host attribute is removed", () => {
    const element = createShopPayButton({ nonce: "nonce-1" });
    document.body.append(element);

    element.removeAttribute("nonce");

    expect(element.shadowRoot?.querySelector("style")?.hasAttribute("nonce")).toBe(false);
  });
});
