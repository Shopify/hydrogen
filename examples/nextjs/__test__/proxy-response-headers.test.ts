import assert from "node:assert/strict";
import test from "node:test";

import { createShopifyRequestContext } from "@shopify/hydrogen";

import { applyProxyResponseHeaders } from "../lib/proxy-response-headers.ts";

const I18N = { country: "US", language: "EN" } as const;

function createRequestContext() {
  return createShopifyRequestContext({
    request: new Request("https://storefront.example/api/reviews"),
    i18n: I18N,
  });
}

test("applyProxyResponseHeaders keeps a route handler's own Link header", () => {
  const headers = new Headers({ "x-middleware-next": "1" });

  applyProxyResponseHeaders(createRequestContext(), headers);

  // Next.js keeps a route handler's Link header only when the proxy response has none.
  assert.equal(headers.has("link"), false);
  assert.equal(headers.get("powered-by"), "Shopify, Hydrogen");
});

test("applyProxyResponseHeaders keeps a Link header the proxy set itself", () => {
  const proxyLink = "</fonts/brand.woff2>; rel=preload; as=font";
  const headers = new Headers({ link: proxyLink });

  applyProxyResponseHeaders(createRequestContext(), headers);

  assert.equal(headers.get("link"), proxyLink);
});
