import { describe, expectTypeOf, it } from "vitest";

import { storefrontRateLimitHeaders, withStorefrontRateLimit } from "./storefront-rate-limit";

// The shape of React Router's `HeadersFunction`. Hydrogen doesn't depend on React Router.
type ReactRouterHeadersFunction = (args: {
  loaderHeaders: Headers;
  parentHeaders: Headers;
  actionHeaders: Headers;
  errorHeaders: Headers | undefined;
}) => Headers | HeadersInit;

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

  it("fits a React Router headers export", () => {
    expectTypeOf(storefrontRateLimitHeaders).toMatchTypeOf<ReactRouterHeadersFunction>();
    expectTypeOf(storefrontRateLimitHeaders).returns.toEqualTypeOf<Headers>();
  });
});
