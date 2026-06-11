// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadScript } from "../utils/load-script";
import {
  createShopPayButton,
  getShopPayButtonAttributes,
  getShopPayButtonDevUrl,
  getShopPayButtonStyleProperties,
  getShopPayButtonUrl,
  handleShopPayCheckoutClick,
  loadShopJs,
  SHOP_PAY_BUTTON_TAG_NAME,
  type ShopPayButtonOptions,
} from "./shop-pay";

vi.mock("../utils/load-script", () => ({
  loadScript: vi.fn(() => Promise.resolve(true)),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadShopJs", () => {
  it("loads the documented Shop Pay button ESM loader", async () => {
    await loadShopJs();

    expect(loadScript).toHaveBeenCalledWith(
      "https://cdn.shopify.com/shopifycloud/shop-js/modules/v2/loader.pay-button.esm.js",
      { module: true },
    );
  });
});

describe("getShopPayButtonAttributes", () => {
  it("normalizes Shopify ProductVariant GIDs to bare variant IDs", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["gid://shopify/ProductVariant/123"],
      }),
    ).toEqual({
      "store-url": "https://example.myshopify.com",
      source: "hydrogen",
      variants: "123",
    });
  });

  it("accepts bare numeric variant IDs", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["123", "456"],
      }).variants,
    ).toBe("123,456");
  });

  it("sets a default source attribution", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["123"],
      }).source,
    ).toBe("hydrogen");
  });

  it("allows overriding source attribution", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["123"],
        source: "custom-source",
      }).source,
    ).toBe("custom-source");
  });

  it("formats variant IDs with quantities", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }, { id: "456" }],
      }).variants,
    ).toBe("123:2,456:1");
  });

  it("sets supported optional attributes", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: " example.myshopify.com ",
        variants: ["123"],
        paymentOption: "shop_pay_installments",
        source: "hydrogen",
        sourceToken: "token-1",
        channel: "headless",
        disabled: true,
      }),
    ).toEqual({
      "store-url": "https://example.myshopify.com",
      variants: "123",
      "payment-option": "shop_pay_installments",
      source: "hydrogen",
      "source-token": "token-1",
      channel: "headless",
      disabled: "",
    });
  });

  it("throws when checkoutUrl is empty", () => {
    expect(() =>
      getShopPayButtonAttributes({
        checkoutUrl: " ",
        variants: ["123"],
      }),
    ).toThrow(/checkoutUrl/);
  });

  it("uses the checkout URL origin for the custom element store URL", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "https://example.myshopify.com/checkouts/cn/cart-1?key=value",
        variants: ["123"],
      })["store-url"],
    ).toBe("https://example.myshopify.com");
  });

  it("omits store-url when no checkoutUrl is provided", () => {
    expect(
      getShopPayButtonAttributes({
        variants: ["123"],
      }),
    ).toEqual({
      variants: "123",
      source: "hydrogen",
    });
  });

  it("omits variants when variants are not provided", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
      }),
    ).toEqual({
      "store-url": "https://example.myshopify.com",
      source: "hydrogen",
    });
  });

  it("omits variants when no variants are provided", () => {
    expect(
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: [],
      }),
    ).toEqual({
      "store-url": "https://example.myshopify.com",
      source: "hydrogen",
    });
  });

  it("throws for mixed variant shapes", () => {
    expect(() =>
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["123", { id: "456", quantity: 2 }],
      } as unknown as ShopPayButtonOptions),
    ).toThrow(/either variant IDs or objects/);
  });

  it("throws for invalid variant IDs", () => {
    expect(() =>
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: ["gid://shopify/Product/123"],
      }),
    ).toThrow(/ProductVariant/);
  });

  it("throws for invalid quantities", () => {
    expect(() =>
      getShopPayButtonAttributes({
        checkoutUrl: "example.myshopify.com",
        variants: [{ id: "123", quantity: 0 }],
      }),
    ).toThrow(/positive integers/);
  });
});

describe("handleShopPayCheckoutClick", () => {
  it("prevents the custom element click and navigates to the local dev checkout URL", () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handleShopPayCheckoutClick(event, {
      checkoutUrl: "https://example.myshopify.com/checkouts/cn/abc?key=value",
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(
      "http://localhost:3000/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("can intercept variant mode before a checkout URL is available", () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handleShopPayCheckoutClick(event, {
      variants: ["123"],
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(
      "http://localhost:3000/cart/123:1?payment=shop_pay&source=hydrogen",
    );
  });
});

describe("getShopPayButtonDevUrl", () => {
  it("builds a same-origin checkout URL for development", () => {
    expect(getShopPayButtonDevUrl({})).toBe(
      "http://localhost:3000/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("builds a same-origin variant cart permalink for development", () => {
    expect(
      getShopPayButtonDevUrl({
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        paymentOption: "shop_pay_installments",
        channel: "headless",
      }),
    ).toBe(
      "http://localhost:3000/cart/123:2?payment=shop_pay_installments&source=hydrogen&channel=headless",
    );
  });
});

describe("getShopPayButtonUrl", () => {
  it("uses the exact checkout URL for checkout mode", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "https://example.myshopify.com/checkouts/cn/abc?key=value",
      }),
    ).toBe(
      "https://example.myshopify.com/checkouts/cn/abc?key=value&payment=shop_pay&source=hydrogen",
    );
  });

  it("builds a cart permalink for variant mode", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "https://example.myshopify.com/checkouts/cn/abc?key=value",
        variants: ["gid://shopify/ProductVariant/123", "456"],
      }),
    ).toBe(
      "https://example.myshopify.com/cart/123:1,456:1?key=value&payment=shop_pay&source=hydrogen",
    );
  });

  it("builds a cart permalink with variant quantities", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com",
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }, { id: "456" }],
      }),
    ).toBe("https://example.myshopify.com/cart/123:2,456:1?payment=shop_pay&source=hydrogen");
  });

  it("preserves checkout URL params before appending supported attribution params", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com?discount=SAVE10&preview=true",
        variants: ["123"],
        paymentOption: "shop_pay_installments",
        source: "custom-source",
        sourceToken: "token-1",
        channel: "headless",
      }),
    ).toBe(
      "https://example.myshopify.com/cart/123:1?discount=SAVE10&preview=true&payment=shop_pay_installments&source=custom-source&source_token=token-1&channel=headless",
    );
  });

  it("lets Shop Pay params override checkout URL params", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com?payment=bogus&source=bogus",
      }),
    ).toBe("https://example.myshopify.com/checkout?payment=shop_pay&source=hydrogen");
  });

  it("uses /checkout for checkout mode when only a store domain is provided", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com",
      }),
    ).toBe("https://example.myshopify.com/checkout?payment=shop_pay&source=hydrogen");
  });

  it("uses /checkout for checkout mode while preserving store-domain search params", () => {
    expect(
      getShopPayButtonUrl({
        checkoutUrl: "example.myshopify.com?discount=SAVE10#ignored",
      }),
    ).toBe(
      "https://example.myshopify.com/checkout?discount=SAVE10&payment=shop_pay&source=hydrogen",
    );
  });

  it("returns null when no checkout URL is available", () => {
    expect(getShopPayButtonUrl({ variants: ["123"] })).toBeNull();
  });
});

describe("getShopPayButtonStyleProperties", () => {
  it("maps style options to shop-js CSS variables", () => {
    expect(
      getShopPayButtonStyleProperties({
        width: "100%",
        height: "48px",
        borderRadius: "6px",
      }),
    ).toEqual({
      "--shop-pay-button-width": "100%",
      "--shop-pay-button-height": "48px",
      "--shop-pay-button-border-radius": "6px",
    });
  });
});

describe("createShopPayButton", () => {
  it("creates a shop-pay-button element with attributes and styles", () => {
    const element = createShopPayButton({
      checkoutUrl: "https://example.myshopify.com/checkouts/cn/cart-1?key=value",
      variants: ["gid://shopify/ProductVariant/123"],
      channel: "headless",
      width: "100%",
    });

    expect(element.tagName.toLowerCase()).toBe(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element.getAttribute("store-url")).toBe("https://example.myshopify.com");
    expect(element.getAttribute("variants")).toBe("123");
    expect(element.getAttribute("source")).toBe("hydrogen");
    expect(element.getAttribute("channel")).toBe("headless");
    expect(element.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");
  });

  it("creates a checkout-mode shop-pay-button element when variants are omitted", () => {
    const element = createShopPayButton({
      checkoutUrl: "example.myshopify.com",
    });

    expect(element.tagName.toLowerCase()).toBe(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element.getAttribute("store-url")).toBe("https://example.myshopify.com");
    expect(element.hasAttribute("variants")).toBe(false);
  });
});
