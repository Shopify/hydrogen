import assert from "node:assert/strict";
import test from "node:test";

import {
  getAccountWidgetConfig,
  getMockShopDomain,
  isMockShopDomain,
  shouldUseMockShop,
  storefrontConfig,
} from "../app/lib/shop.ts";

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

test("account widget returns only public config for a real store with both tokens", () => {
  const config = getAccountWidgetConfig({
    PRIVATE_STOREFRONT_API_TOKEN: "private-token",
    PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
    PUBLIC_STOREFRONT_API_TOKEN: "public-token",
  });

  assert.deepEqual(config, {
    storeDomain: "real-store.myshopify.com",
    publicAccessToken: "public-token",
  });
});

test("account widget falls back to the default store domain when PUBLIC_STORE_DOMAIN is unset", () => {
  assert.deepEqual(
    getAccountWidgetConfig({
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_STOREFRONT_API_TOKEN: "public-token",
    }),
    { storeDomain: storefrontConfig.storeDomain, publicAccessToken: "public-token" },
  );
  assert.equal(storefrontConfig.storeDomain, "hydrogen-preview.myshopify.com");
});

test("account widget is disabled without a public token or in mock mode", () => {
  assert.equal(
    getAccountWidgetConfig({
      PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
      PUBLIC_STOREFRONT_API_TOKEN: "public-token",
    }),
    null,
  );
  assert.equal(
    getAccountWidgetConfig({
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
    }),
    null,
  );
  assert.equal(
    getAccountWidgetConfig({
      MOCK_SHOP: "1",
      PRIVATE_STOREFRONT_API_TOKEN: "private-token",
      PUBLIC_STORE_DOMAIN: "real-store.myshopify.com",
      PUBLIC_STOREFRONT_API_TOKEN: "public-token",
    }),
    null,
  );
  for (const domain of ["mock.shop", "pets.mock.shop"]) {
    assert.equal(
      getAccountWidgetConfig({
        PRIVATE_STOREFRONT_API_TOKEN: "private-token",
        PUBLIC_STORE_DOMAIN: domain,
        PUBLIC_STOREFRONT_API_TOKEN: "public-token",
      }),
      null,
      domain,
    );
  }
});
