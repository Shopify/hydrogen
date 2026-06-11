import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import { handleShopifyRoutesDev as handleShopifyRoutesDevImpl } from "./handle-shopify-routes.development";
import { createStorefrontRequestContext } from "./headers";
import { assert } from "./test-utils";

const defaultConfig = {
  storeDomain: "test-store.myshopify.com",
  i18n: { country: "US", language: "EN" },
} as const;

function handleShopifyRoutesDev(
  options: Omit<Parameters<typeof handleShopifyRoutesDevImpl>[0], "storefrontClient">,
) {
  return handleShopifyRoutesDevImpl({
    ...options,
    storefrontClient: createStorefrontClient({
      type: "private",
      config: {
        storeDomain: defaultConfig.storeDomain,
        i18n: defaultConfig.i18n,
        privateStorefrontToken: "test-private-token",
        buyerIp: "127.0.0.1",
        requestContext: createStorefrontRequestContext(options.request),
      },
    }),
  });
}

describe("handleShopifyRoutesDev", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  });

  it("serves GraphiQL from the development routes", async () => {
    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/graphiql"),
    });

    assert(result, "expected GraphiQL response");
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("text/html");
  });

  it("falls through to production Hydrogen routes", async () => {
    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/api/mcp", {
        method: "POST",
        body: "{}",
      }),
    });

    assert(result, "expected MCP proxy response");
    expect(result.status).toBe(200);
  });
});
