// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ShopPayModule from "../core/shop-pay";
import { loadShopJs, SHOP_PAY_BUTTON_TAG_NAME } from "../core/shop-pay";
import { ShopPayButton } from "./shop-pay";

vi.mock("../core/shop-pay", async (importOriginal) => {
  const actual = await importOriginal<typeof ShopPayModule>();

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
    const { container } = render(
      createElement(ShopPayButton, {
        variants: ["gid://shopify/ProductVariant/123"],
        channel: "headless",
        width: "100%",
      }),
    );

    const element = container.querySelector<HTMLElement>(SHOP_PAY_BUTTON_TAG_NAME);

    expect(element).not.toBeNull();
    expect(element?.getAttribute("store-url")).toBe("http://localhost:3000");
    expect(element?.getAttribute("variants")).toBe("123");
    expect(element?.getAttribute("source")).toBe("hydrogen");
    expect(element?.getAttribute("channel")).toBe("headless");
    expect(element?.style.getPropertyValue("--shop-pay-button-width")).toBe("100%");

    await waitFor(() => expect(loadShopJs).toHaveBeenCalledTimes(1));
  });

  it("can skip loading shop-js", () => {
    render(
      createElement(ShopPayButton, {
        loadScript: false,
      }),
    );

    expect(loadShopJs).not.toHaveBeenCalled();
  });

  it("renders without variants for checkout mode", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        loadScript: false,
      }),
    );

    const element = container.querySelector<HTMLElement>(SHOP_PAY_BUTTON_TAG_NAME);

    expect(element?.getAttribute("store-url")).toBe("http://localhost:3000");
    expect(element?.hasAttribute("variants")).toBe(false);
  });

  it("does not require CartProvider", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        loadScript: false,
      }),
    );

    expect(container.querySelector(SHOP_PAY_BUTTON_TAG_NAME)).not.toBeNull();
  });

  it("builds a same-origin checkout URL for checkout-mode clicks", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        loadScript: false,
      }),
    );

    const element = container.querySelector<HTMLElement>(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element).not.toBeNull();
    expect(element?.getAttribute("store-url")).toBe("http://localhost:3000");

    fireEvent.click(element as HTMLElement);

    expect(window.location.href).toBe(
      "http://localhost:3000/checkout?payment=shop_pay&source=hydrogen",
    );
  });

  it("builds the variant cart permalink for variant-mode clicks", () => {
    const { container } = render(
      createElement(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        loadScript: false,
      }),
    );

    const element = container.querySelector<HTMLElement>(SHOP_PAY_BUTTON_TAG_NAME);
    expect(element).not.toBeNull();

    fireEvent.click(element as HTMLElement);

    expect(window.location.href).toBe(
      "http://localhost:3000/cart/123:2?payment=shop_pay&source=hydrogen",
    );
  });

  it("logs when shop-js fails to load", async () => {
    const error = new Error("network unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadShopJs).mockRejectedValueOnce(error);

    render(
      createElement(ShopPayButton, {
        variants: ["123"],
      }),
    );

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "[hydrogen:error:ShopPay] shop-js failed to load:",
        error,
      ),
    );

    consoleError.mockRestore();
  });

  it("renders the element during SSR", () => {
    const html = renderToString(
      createElement(ShopPayButton, {
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
