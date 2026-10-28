import { describe, expect, it } from "vitest";

import { cartIdFromCheckoutUrl } from "./verify";

describe("cartIdFromCheckoutUrl", () => {
  it("reads the Storefront API checkout URL, keeping the key", () => {
    expect(
      cartIdFromCheckoutUrl(new URL("https://shop.example/cart/c/abc123?key=secret&_s=1")),
    ).toBe("gid://shopify/Cart/abc123?key=secret");
  });

  it("reads the checkout a Liquid cart form redirects to", () => {
    expect(
      cartIdFromCheckoutUrl(new URL("https://shop.example/checkouts/cn/hWNIV5/en-us?_r=x")),
    ).toBe("gid://shopify/Cart/hWNIV5");
  });

  it("returns null for other paths", () => {
    expect(cartIdFromCheckoutUrl(new URL("https://shop.example/checkout"))).toBeNull();
  });
});
