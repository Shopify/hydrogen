import assert from "node:assert/strict";
import test from "node:test";

import { getMockShopDomain, isMockShopDomain, shouldUseMockShop } from "../app/lib/shop.ts";

test("uses a real store only when credentials exist and mock mode is not forced", () => {
  assert.equal(shouldUseMockShop({}), true);
  assert.equal(shouldUseMockShop({ PRIVATE_STOREFRONT_API_TOKEN: "private-token" }), false);
  assert.equal(
    shouldUseMockShop({ MOCK_SHOP: "1", PRIVATE_STOREFRONT_API_TOKEN: "private-token" }),
    true,
  );
  assert.equal(
    shouldUseMockShop({
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_STORE_DOMAIN: "pets.mock.shop",
    }),
    true,
  );
});

test("recognizes the default mock.shop store and per-store mock.shop hosts", () => {
  assert.equal(isMockShopDomain("mock.shop"), true);
  assert.equal(isMockShopDomain("pets.mock.shop"), true);
  assert.equal(isMockShopDomain("hydrogen-preview.myshopify.com"), false);
  assert.equal(isMockShopDomain("notmock.shop"), false);
  assert.equal(isMockShopDomain(undefined), false);
});

test("mock mode reads the store from PUBLIC_STORE_DOMAIN when it is a mock.shop host", () => {
  assert.equal(getMockShopDomain({}), "mock.shop");
  assert.equal(getMockShopDomain({ PUBLIC_STORE_DOMAIN: "pets.mock.shop" }), "pets.mock.shop");
  assert.equal(
    getMockShopDomain({ PUBLIC_STORE_DOMAIN: "hydrogen-preview.myshopify.com" }),
    "mock.shop",
  );
});
