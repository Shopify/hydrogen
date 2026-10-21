import assert from "node:assert/strict";
import test from "node:test";

import { readEnv } from "../app/env.ts";

const REQUIRED = {
  PUBLIC_STORE_DOMAIN: "shop.myshopify.com",
  SESSION_SECRET: "secret",
  SHOP_ID: "1",
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "shp_client",
};

test("reads the required variables and treats empty optional ones as unset", () => {
  const env = readEnv({ ...REQUIRED, PRIVATE_STOREFRONT_API_TOKEN: "", PUBLIC_STOREFRONT_ID: "7" });

  assert.equal(env.PUBLIC_STORE_DOMAIN, "shop.myshopify.com");
  assert.equal(env.PRIVATE_STOREFRONT_API_TOKEN, undefined);
  assert.equal(env.PUBLIC_STOREFRONT_ID, "7");
});

test("names every missing required variable before the server starts", () => {
  assert.throws(
    () => readEnv({ PUBLIC_STORE_DOMAIN: "shop.myshopify.com", SHOP_ID: "" }),
    /SESSION_SECRET, SHOP_ID, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID are required/,
  );
});
