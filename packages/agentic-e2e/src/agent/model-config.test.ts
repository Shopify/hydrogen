import { describe, expect, it } from "vitest";

import { shopifyProxyModel } from "./model-config.ts";

const KEY = "sk-secret-proxy-key-123";

describe("shopifyProxyModel", () => {
  it.each([{}, { SHOPIFY_PROXY_KEY: "" }, { SHOPIFY_PROXY_KEY: "  " }])(
    "throws when the key is missing: %j",
    (env) => {
      expect(() => shopifyProxyModel({ ...env, ANTHROPIC_API_KEY: "sk-other" })).toThrow(
        "SHOPIFY_PROXY_KEY is not set.",
      );
    },
  );

  it("rejects a key with a line break without echoing it", () => {
    // The whole message is fixed text, so it cannot hold the key.
    expect(() => shopifyProxyModel({ SHOPIFY_PROXY_KEY: `${KEY}\nInjected: header` })).toThrow(
      /^SHOPIFY_PROXY_KEY must be one line\.$/,
    );
  });
});
