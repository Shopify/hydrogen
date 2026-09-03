import assert from "node:assert/strict";
import test from "node:test";

import { shouldUseMockShop } from "../app/lib/shop.ts";

test("uses a real store only when credentials exist and mock mode is not forced", () => {
  assert.equal(shouldUseMockShop({}), true);
  assert.equal(shouldUseMockShop({ PRIVATE_STOREFRONT_API_TOKEN: "private-token" }), false);
  assert.equal(
    shouldUseMockShop({ MOCK_SHOP: "1", PRIVATE_STOREFRONT_API_TOKEN: "private-token" }),
    true,
  );
});
