import { expectTypeOf, it } from "vitest";

import type { StorefrontAnalyticsConfig } from "../../analytics/types";
import { shopifyAnalyticsBootstrap } from "../analytics";
import { shopifyGlobalBootstrap, type ShopifyGlobalConfig } from "../global";

it("checks serialized configuration against each bootstrap's input type", () => {
  expectTypeOf(shopifyGlobalBootstrap.code).toEqualTypeOf<string>();
  expectTypeOf(shopifyGlobalBootstrap.serializeConfig).parameter(0).toEqualTypeOf<ShopifyGlobalConfig>();
  expectTypeOf(shopifyAnalyticsBootstrap.serializeConfig)
    .parameter(0)
    .toEqualTypeOf<StorefrontAnalyticsConfig>();
  expectTypeOf(shopifyGlobalBootstrap.serializeConfig).returns.toEqualTypeOf<string>();

  // @ts-expect-error a global bootstrap needs its complete configuration
  () => shopifyGlobalBootstrap.serializeConfig({ country: "US" });
  // @ts-expect-error analytics configuration has a different shape from the global bootstrap
  () => shopifyGlobalBootstrap.serializeConfig({ shop: null, consent: {} });
  // @ts-expect-error undefined cannot be serialized as JSON configuration
  () => shopifyAnalyticsBootstrap.serializeConfig(undefined);
});
