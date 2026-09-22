import { describe, expectTypeOf, it } from "vitest";

import type { ShopifyGlobal } from "./index";
import type { ShopifyScriptTagsOptions } from "./shopify-scripts";

describe("Shopify script option types", () => {
  it("requires complete shop identity", () => {});
});

export function shopifyGlobalTypes(shopify: ShopifyGlobal) {
  // @ts-expect-error consent diagnostics are not part of the public ShopifyGlobal type
  shopify.customerPrivacy.config?.debug;

  // @ts-expect-error consent diagnostics are not exposed on window.Shopify
  window.Shopify?.customerPrivacy.config?.debug;
}

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
