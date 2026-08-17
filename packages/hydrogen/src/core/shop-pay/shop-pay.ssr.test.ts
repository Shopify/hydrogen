import { describe, expect, it } from "vitest";

import { renderShopPayButton } from "./shop-pay";

describe("renderShopPayButton SSR", () => {
  it("renders a declarative shadow root for zero-JavaScript styling", () => {
    const html = renderShopPayButton({ variants: ["123"], width: "100%", nonce: "nonce-1" });

    expect(html).toContain('<hydrogen-shop-pay-button variants="123:1" width="100%">');
    expect(html).toContain('<template shadowrootmode="open">');
    expect(html).toContain('<style nonce="nonce-1">:host{display:block}');
    expect(html).toContain("background-color:#5433eb");
    expect(html).toContain('href="/cart/123:1?payment=shop_pay&amp;source=hydrogen"');
  });
});
