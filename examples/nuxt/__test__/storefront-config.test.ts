import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { storefrontConfig } from "../../shared/config.ts";

const RESOLVER_URL = new URL("../storefront/storefront-config.ts", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === RESOLVER_URL && specifier === "../../shared/config") {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { resolveStorefrontConfig } = await import("../storefront/storefront-config.ts");
const MOCK_DEFAULT = { mode: "mock", storeDomain: "mock.shop" };
const PRIVATE_TOKEN = "private-test-token";
const PRIVATE_DEFAULT = {
  mode: "private",
  storeDomain: storefrontConfig.storeDomain,
  privateStorefrontToken: PRIVATE_TOKEN,
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
    assert.deepEqual(resolveStorefrontConfig(env), MOCK_DEFAULT);
  }
});

test("mock.shop domains select mock mode but look-alike hosts do not", () => {
  for (const domain of ["mock.shop", "pets.mock.shop"]) {
    assert.deepEqual(
      resolveStorefrontConfig({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      { mode: "mock", storeDomain: domain },
    );
  }
  for (const domain of ["notmock.shop", "mock.shop.example.com"]) {
    assert.deepEqual(
      resolveStorefrontConfig({
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
      resolveStorefrontConfig({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      PRIVATE_DEFAULT,
    );
  }
});
