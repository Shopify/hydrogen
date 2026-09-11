import { describe, expectTypeOf, it } from "vitest";

import type { ShopifyScriptTagsOptions } from "./shopify-scripts";

describe("Shopify script option types", () => {
  it("requires complete shop identity", () => {});
});

export function shopifyScriptOptionTypes() {
  expectTypeOf<ShopifyScriptTagsOptions["shop"]>().toEqualTypeOf<{
    shopId: string;
    storefrontId: string;
    myshopifyDomain: string;
  }>();

  // @ts-expect-error shop is required
  const missingShop: ShopifyScriptTagsOptions = {};
  void missingShop;

  const missingShopId: ShopifyScriptTagsOptions = {
    // @ts-expect-error shopId is required
    shop: {
      storefrontId: "sub-1",
      myshopifyDomain: "test-shop.myshopify.com",
    },
  };
  void missingShopId;
}
