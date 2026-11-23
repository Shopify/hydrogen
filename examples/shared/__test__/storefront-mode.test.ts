import assert from "node:assert/strict";
import test from "node:test";

import { analyticsConsent, shop, storefrontConfig } from "../config.ts";
import { resolveStorefrontMode } from "../storefront-mode.ts";

const PRIVATE_TOKEN = "private-test-token";

function mockMode(storeDomain: string) {
  return {
    mode: "mock",
    storeDomain,
    shopIdentity: {
      analytics: { channel: "headless" },
      consent: undefined,
      shop: { shopId: "0", storefrontId: "", myshopifyDomain: storeDomain },
      shopifyAnalytics: false,
    },
    customerAccountsEnabled: false,
  };
}

const MOCK_DEFAULT = mockMode("mock.shop");
const PRIVATE_DEFAULT = {
  mode: "private",
  storeDomain: storefrontConfig.storeDomain,
  privateStorefrontToken: PRIVATE_TOKEN,
  shopIdentity: {
    analytics: undefined,
    consent: analyticsConsent,
    shop,
    shopifyAnalytics: true,
  },
  customerAccountsEnabled: true,
};

test("default mock mode and the MOCK_SHOP override", () => {
  for (const env of [
    {},
    { PRIVATE_STOREFRONT_API_TOKEN: "" },
    { PUBLIC_STORE_DOMAIN: "another-store.myshopify.com" },
    {
      MOCK_SHOP: "1",
      PUBLIC_STORE_DOMAIN: "another-store.myshopify.com",
      PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
    },
  ]) {
    assert.deepEqual(resolveStorefrontMode(env), MOCK_DEFAULT);
  }
});

test("mock.shop domains select mock mode but look-alike hosts do not", () => {
  for (const domain of ["mock.shop", "pets.mock.shop"]) {
    assert.deepEqual(
      resolveStorefrontMode({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      mockMode(domain),
    );
  }
  for (const domain of ["notmock.shop", "mock.shop.example.com"]) {
    assert.deepEqual(
      resolveStorefrontMode({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      PRIVATE_DEFAULT,
    );
  }
});

test("private mode always uses the shared private store", () => {
  for (const domain of [undefined, storefrontConfig.storeDomain, "another-store.myshopify.com"]) {
    assert.deepEqual(
      resolveStorefrontMode({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      PRIVATE_DEFAULT,
    );
  }
});
