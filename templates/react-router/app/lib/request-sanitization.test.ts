import assert from "node:assert/strict";
import test from "node:test";

import { CUSTOMER_SESSION_COOKIE_NAME } from "./customer-session.ts";
import { requestForShopifyContext } from "./request-sanitization.ts";

test("removes the customer session cookie and preserves other cookies", () => {
  const request = new Request("https://example.com/products", {
    headers: {
      cookie: `_shopify_analytics=analytics; ${CUSTOMER_SESSION_COOKIE_NAME}=secret; cart=cart-id`,
    },
  });

  const sanitized = requestForShopifyContext(request);

  assert.equal(sanitized.headers.get("cookie"), "_shopify_analytics=analytics; cart=cart-id");
});

test("creates a bodyless context request without consuming the original body", async () => {
  const body = JSON.stringify({ query: "query Test { shop { name } }" });
  const request = new Request("https://example.com/api/2026-10/graphql.json", {
    method: "POST",
    headers: { cookie: `${CUSTOMER_SESSION_COOKIE_NAME}=secret` },
    body,
  });

  const sanitized = requestForShopifyContext(request);

  assert.equal(sanitized.headers.has("cookie"), false);
  assert.equal(sanitized.body, null);
  assert.equal(request.bodyUsed, false);
  assert.equal(await request.text(), body);
});
