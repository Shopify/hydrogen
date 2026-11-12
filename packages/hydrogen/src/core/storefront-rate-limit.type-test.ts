import { describe, expectTypeOf, it } from "vitest";

import { withStorefrontRateLimit } from "./storefront-rate-limit";

describe("storefront rate limit types", () => {
  it("keeps the loader arguments and the awaited loader result", () => {
    const loader = withStorefrontRateLimit(async (args: { params: { handle?: string } }) => ({
      handle: args.params.handle,
    }));
    const syncLoader = withStorefrontRateLimit(() => "value" as const);

    expectTypeOf(loader).parameters.toEqualTypeOf<[{ params: { handle?: string } }]>();
    expectTypeOf(loader).returns.toEqualTypeOf<Promise<{ handle: string | undefined }>>();
    expectTypeOf(syncLoader).returns.toEqualTypeOf<Promise<"value">>();
  });
});
