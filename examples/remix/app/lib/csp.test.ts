import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { createContentSecurityPolicy } from "./csp.ts";

describe("createContentSecurityPolicy", () => {
  it("creates a fresh nonce and includes it in the script policy", () => {
    const first = createContentSecurityPolicy("shop.example");
    const second = createContentSecurityPolicy("shop.example");

    assert.notEqual(first.nonce, second.nonce);
    assert.match(first.nonce, /^[a-f0-9]{32}$/);
    const scriptSrc = first.header
      .split("; ")
      .find((directive) => directive.startsWith("script-src "));
    assert.ok(scriptSrc?.includes(`'nonce-${first.nonce}'`));
    assert.ok(!scriptSrc?.includes("'unsafe-inline'"));
  });

  it("allows Shopify resources and the inline styles used by Remix", () => {
    const { header } = createContentSecurityPolicy("shop.example");

    assert.ok(header.includes("style-src 'self' 'unsafe-inline' https://cdn.shopify.com"));
    assert.ok(header.includes("https://shop.example"));
    assert.ok(header.includes("https://monorail-edge.shopifysvc.com"));
    assert.ok(header.includes("frame-ancestors 'none'"));
  });
});
