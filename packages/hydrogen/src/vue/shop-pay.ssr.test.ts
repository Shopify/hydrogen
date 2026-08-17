import { describe, expect, it } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import { ShopPayButton } from "./shop-pay";

describe("ShopPayButton SSR", () => {
  it("renders a working declarative shadow root without client JavaScript", async () => {
    const html = await renderToString(
      h(ShopPayButton, {
        variants: [{ id: "gid://shopify/ProductVariant/123", quantity: 2 }],
        paymentOption: "shop_pay_installments",
      }),
    );

    expect(html).toContain("<hydrogen-shop-pay-button");
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('href="/cart/123:2?payment=shop_pay_installments&amp;source=hydrogen"');
    expect(html).toContain('aria-label="Buy with Shop Pay"');
    expect(html).toContain(".shop-pay-button[aria-disabled=true]{opacity:.5");
  });
});
