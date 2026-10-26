import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { readEnv } from "./env.ts";

const REQUIRED = {
  PUBLIC_STORE_DOMAIN: "shop.myshopify.com",
  SESSION_SECRET: "secret",
  SHOP_ID: "1",
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "shp_client",
};

describe("readEnv", () => {
  it("reads the required variables and treats empty optional ones as unset", () => {
    const env = readEnv({
      ...REQUIRED,
      NODE_ENV: "development",
      PRIVATE_STOREFRONT_API_TOKEN: "",
      PUBLIC_STOREFRONT_ID: "7",
    });

    assert.equal(env.PUBLIC_STORE_DOMAIN, "shop.myshopify.com");
    assert.equal(env.PRIVATE_STOREFRONT_API_TOKEN, undefined);
    assert.equal(env.PUBLIC_STOREFRONT_ID, "7");
  });

  it("names every missing required variable before the server starts", () => {
    assert.throws(
      () => readEnv({ PUBLIC_STORE_DOMAIN: "shop.myshopify.com", SHOP_ID: "" }),
      /SESSION_SECRET, SHOP_ID, PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID are required/,
    );
  });

  it("rejects short or example session secrets outside development and tests", () => {
    assert.throws(
      () => readEnv({ ...REQUIRED, NODE_ENV: "production" }),
      /SESSION_SECRET must be at least 32 characters and must not use the example value outside development and tests/,
    );
    assert.throws(
      () =>
        readEnv({
          ...REQUIRED,
          SESSION_SECRET: "local-dev-session-secret-32-characters",
          NODE_ENV: "production",
        }),
      /must not use the example value outside development and tests/,
    );
    assert.throws(
      () => readEnv(REQUIRED),
      /must not use the example value outside development and tests/,
    );
  });

  it("accepts a sufficiently long non-example secret in production", () => {
    assert.equal(
      readEnv({
        ...REQUIRED,
        SESSION_SECRET: "a-generated-production-secret-with-more-than-32-characters",
        NODE_ENV: "production",
      }).SESSION_SECRET,
      "a-generated-production-secret-with-more-than-32-characters",
    );
  });
});
