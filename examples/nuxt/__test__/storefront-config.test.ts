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

test("no token selects the default mock store", () => {
  assert.deepEqual(resolveStorefrontConfig({}), MOCK_DEFAULT);
  assert.deepEqual(resolveStorefrontConfig({ PRIVATE_STOREFRONT_API_TOKEN: "" }), MOCK_DEFAULT);
});

test("MOCK_SHOP forces mock mode even with a private token and non-mock domain", () => {
  assert.deepEqual(
    resolveStorefrontConfig({
      MOCK_SHOP: "1",
      PUBLIC_STORE_DOMAIN: "another-store.myshopify.com",
      PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
    }),
    MOCK_DEFAULT,
  );
});

test("mock.shop and its subdomains select mock mode with or without a token", () => {
  for (const domain of ["mock.shop", "pets.mock.shop", "nested.pets.mock.shop"]) {
    for (const privateStorefrontToken of [undefined, PRIVATE_TOKEN]) {
      assert.deepEqual(
        resolveStorefrontConfig({
          PUBLIC_STORE_DOMAIN: domain,
          PRIVATE_STOREFRONT_API_TOKEN: privateStorefrontToken,
        }),
        { mode: "mock", storeDomain: domain },
      );
    }
  }
});

test("look-alike mock.shop hosts with a token use the shared private store", () => {
  for (const domain of ["notmock.shop", "mock.shop.example.com", "pets.mock.shop.example.com"]) {
    assert.deepEqual(
      resolveStorefrontConfig({
        PUBLIC_STORE_DOMAIN: domain,
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
      }),
      PRIVATE_DEFAULT,
    );
  }
});

test("non-mock domain overrides without a token use the default mock store", () => {
  assert.deepEqual(
    resolveStorefrontConfig({ PUBLIC_STORE_DOMAIN: "another-store.myshopify.com" }),
    MOCK_DEFAULT,
  );
});

test("private mode uses the shared private store for default, matching, and other domains", () => {
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
