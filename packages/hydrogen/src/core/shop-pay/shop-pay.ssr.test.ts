import { describe, expect, it } from "vitest";

import { renderShopPayButton } from "./shop-pay";

describe("renderShopPayButton SSR", () => {
  it("renders a declarative shadow root for zero-JavaScript styling", () => {
    const html = renderShopPayButton({ variants: ["123"], width: "100%", nonce: "nonce-1" });

    expect(html).toContain(
      '<hydrogen-shop-pay-button nonce="nonce-1" variants="123:1" width="100%">',
    );
    expect(html).toContain('<template shadowrootmode="open" shadowroot="open">');
    expect(html).toContain('<style nonce="nonce-1">:host{display:block}');
    expect(html).toContain("background-color:#5433eb");
    expect(html).toContain('href="/cart/123:1?payment=shop_pay&amp;source=hydrogen"');
  });

  it("escapes attribute values and omits whitespace-only nonces", () => {
    const html = renderShopPayButton({
      accessibilityLabel: 'Buy <b>"now"</b> & save',
      nonce: 'n"once&<>',
    });

    expect(html).toContain(
      'accessibility-label="Buy &lt;b&gt;&quot;now&quot;&lt;/b&gt; &amp; save"',
    );
    expect(html).toContain('aria-label="Buy &lt;b&gt;&quot;now&quot;&lt;/b&gt; &amp; save"');
    expect(html).toContain('<style nonce="n&quot;once&amp;&lt;&gt;">');

    const blankNonce = renderShopPayButton({ nonce: "  " });
    expect(blankNonce).not.toContain("nonce=");
    expect(blankNonce).toContain("<style>");
  });
});
