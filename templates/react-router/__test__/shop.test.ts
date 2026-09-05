import assert from "node:assert/strict";
import test from "node:test";

import { resolveRuntimeConfig } from "../app/lib/shop.ts";

test("resolves mock and real storefront configuration", () => {
  assert.equal(resolveRuntimeConfig({}).usingMockShop, true);
  assert.equal(
    resolveRuntimeConfig({ MOCK_SHOP: "1", PRIVATE_STOREFRONT_API_TOKEN: "private-token" })
      .usingMockShop,
    true,
  );
  assert.equal(
    resolveRuntimeConfig({
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_STORE_DOMAIN: "example.myshopify.com",
      PUBLIC_STOREFRONT_ID: "storefront-id",
    }).usingMockShop,
    false,
  );
});
