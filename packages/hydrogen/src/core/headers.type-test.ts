import { describe, expectTypeOf, it } from "vitest";

import {
  defineHeaderList,
  type ShopifyHeaderName,
  type StandardHeaderName,
} from "./headers";

describe("header list types", () => {
  it("preserves known header literals", () => {
    const headers = defineHeaderList("accept", "X-Shopify-UniqueToken");

    expectTypeOf(headers).toEqualTypeOf<readonly ["accept", "X-Shopify-UniqueToken"]>();
    expectTypeOf<"accept">().toMatchTypeOf<StandardHeaderName>();
    expectTypeOf<"X-Shopify-UniqueToken">().toMatchTypeOf<ShopifyHeaderName>();
  });

  it("rejects unknown header names", () => {
    // @ts-expect-error header names must be added to KnownHeaderName
    defineHeaderList("content-lenght");
  });
});
