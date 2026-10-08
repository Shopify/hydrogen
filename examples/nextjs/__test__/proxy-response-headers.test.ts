import assert from "node:assert/strict";
import test from "node:test";

import { createShopifyRequestContext } from "@shopify/hydrogen";

import { applyProxyResponseHeaders } from "../lib/proxy-response-headers.ts";

const I18N = { country: "US", language: "EN" } as const;
const UCP_PROFILE_LINK = '</.well-known/ucp>; rel="ucp"';

function createRequestContext() {
  return createShopifyRequestContext({
    request: new Request("https://storefront.example/api/reviews"),
    i18n: I18N,
  });
}

// Next.js 16 copies proxy response headers onto the outgoing response first, then
// `sendResponse` (next/dist/server/send-response.js) appends a route handler's header only
// when the proxy did not already set it, apart from a few multi-value headers.
const NEXT_MULTI_VALUE_HEADERS = new Set([
  "set-cookie",
  "www-authenticate",
  "proxy-authenticate",
  "vary",
]);

function sendLikeNext(proxyHeaders: Headers, routeHeaders: Headers): Headers {
  const outgoing = new Headers(proxyHeaders);
  routeHeaders.forEach((value, name) => {
    if (NEXT_MULTI_VALUE_HEADERS.has(name) || !outgoing.has(name)) outgoing.append(name, value);
  });
  return outgoing;
}

test("Hydrogen adds a UCP link that would replace route handler links under Next.js", () => {
  const proxyHeaders = new Headers({ "x-middleware-next": "1" });
  createRequestContext().applyResponseHeaders(proxyHeaders);

  const routeHeaders = new Headers({ link: '</docs>; rel="describedby"' });

  assert.equal(sendLikeNext(proxyHeaders, routeHeaders).get("link"), UCP_PROFILE_LINK);
});

test("applyProxyResponseHeaders keeps a route handler's own Link header", () => {
  const proxyHeaders = new Headers({ "x-middleware-next": "1" });
  applyProxyResponseHeaders(createRequestContext(), proxyHeaders);

  const routeLink = '</docs>; rel="describedby"';
  const response = sendLikeNext(proxyHeaders, new Headers({ link: routeLink }));

  assert.equal(response.get("link"), routeLink);
});

test("applyProxyResponseHeaders still applies Hydrogen's other response headers", () => {
  const headers = new Headers({ "x-middleware-next": "1" });

  applyProxyResponseHeaders(createRequestContext(), headers);

  assert.equal(headers.get("powered-by"), "Shopify, Hydrogen");
  assert.equal(headers.has("link"), false);
});

test("applyProxyResponseHeaders keeps a Link header the proxy set itself", () => {
  const proxyLink = "</fonts/brand.woff2>; rel=preload; as=font";
  const headers = new Headers({ link: proxyLink });

  applyProxyResponseHeaders(createRequestContext(), headers);

  assert.equal(headers.get("link"), proxyLink);
});
