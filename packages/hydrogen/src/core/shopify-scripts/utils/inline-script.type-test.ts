import { expectTypeOf, it } from "vitest";

import type { StorefrontAnalyticsConfig } from "../../analytics/types";
import { shopifyAnalyticsBootstrap } from "../analytics";
import { shopifyGlobalBootstrap, type ShopifyGlobalConfig } from "../global";

it("checks configuration attributes against each bootstrap's input type", () => {
  expectTypeOf(shopifyGlobalBootstrap.code).toEqualTypeOf<string>();
  expectTypeOf(shopifyGlobalBootstrap.attributes).parameter(0).toEqualTypeOf<ShopifyGlobalConfig>();
  expectTypeOf(shopifyAnalyticsBootstrap.attributes)
    .parameter(0)
    .toEqualTypeOf<StorefrontAnalyticsConfig>();
  expectTypeOf(shopifyGlobalBootstrap.attributes).returns.toEqualTypeOf<{ "data-config": string }>();

  // @ts-expect-error a global bootstrap needs its complete configuration
  () => shopifyGlobalBootstrap.attributes({ country: "US" });
  // @ts-expect-error analytics configuration has a different shape from the global bootstrap
  () => shopifyGlobalBootstrap.attributes({ shop: null, consent: {} });
  // @ts-expect-error undefined cannot be serialized as JSON configuration
  () => shopifyAnalyticsBootstrap.attributes(undefined);
});
