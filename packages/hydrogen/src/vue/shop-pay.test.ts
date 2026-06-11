// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { loadShopJs, SHOP_PAY_BUTTON_TAG_NAME } from "../core/shop-pay";
import { ShopPayButton } from "./shop-pay";

vi.mock("../core/shop-pay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/shop-pay")>();

  return {
    ...actual,
    loadShopJs: vi.fn(() => Promise.resolve()),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ShopPayButton", () => {
  it("renders the shop-pay-button custom element", async () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        variants: ["gid://shopify/ProductVariant/123"],
        channel: "headless",
        width: "100%",
        class: "shop-pay",
      },
    });
    await nextTick();

    const element = wrapper.find(SHOP_PAY_BUTTON_TAG_NAME).element as HTMLElement;

    expect(element).not.toBeNull();
    expect(element.getAttribute("store-url")).toBe("http://localhost:3000");
    expect(element.getAttribute("variants")).toBe("123");
    expect(element.getAttribute("source")).toBe("hydrogen");
    expect(element.getAttribute("channel")).toBe("headless");
    expect(element.className).toBe("shop-pay");
    expect(element.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");
    expect(loadShopJs).toHaveBeenCalledTimes(1);
  });

  it("can skip loading shop-js", () => {
    mount(ShopPayButton, {
      props: {
        loadScript: false,
      },
    });

    expect(loadShopJs).not.toHaveBeenCalled();
  });

  it("renders without variants for checkout mode", async () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        loadScript: false,
      },
    });
    await nextTick();

    const element = wrapper.find(SHOP_PAY_BUTTON_TAG_NAME).element as HTMLElement;

    expect(element.getAttribute("store-url")).toBe("http://localhost:3000");
    expect(element.hasAttribute("variants")).toBe(false);
  });

  it("does not require CartProvider", () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        loadScript: false,
      },
    });

    expect(wrapper.find(SHOP_PAY_BUTTON_TAG_NAME).exists()).toBe(true);
  });

  it("builds a same-origin checkout URL for checkout-mode clicks", async () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        loadScript: false,
      },
    });
    await nextTick();

    const element = wrapper.find(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element.exists()).toBe(true);
    expect(element.element.getAttribute("store-url")).toBe("http://localhost:3000");

    await element.trigger("click");

    expect(window.location.href).toBe(
      "http://localhost:3000/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("builds the variant cart permalink for variant-mode clicks", async () => {
    const wrapper = mount(ShopPayButton, {
      props: {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        loadScript: false,
      },
    });

    const element = wrapper.find(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element.exists()).toBe(true);

    await element.trigger("click");

    expect(window.location.href).toBe(
      "http://localhost:3000/cart/123:2?payment=shop_pay&source=hydrogen",
    );
  });

  it("logs when shop-js fails to load", async () => {
    const error = new Error("network unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadShopJs).mockRejectedValueOnce(error);

    mount(ShopPayButton, {
      props: {
        variants: ["123"],
      },
    });

    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "[hydrogen:error:ShopPay] shop-js failed to load:",
        error,
      ),
    );

    consoleError.mockRestore();
  });

  it("renders the element during SSR", async () => {
    const html = await renderToString(
      h(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        paymentOption: "shop_pay_installments",
      }),
    );

    expect(html).toContain(`<${SHOP_PAY_BUTTON_TAG_NAME}`);
    expect(html).not.toContain("store-url=");
    expect(html).toContain('variants="123:2"');
    expect(html).toContain('source="hydrogen"');
    expect(html).toContain('payment-option="shop_pay_installments"');
  });
});
