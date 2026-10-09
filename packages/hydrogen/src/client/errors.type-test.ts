import { describe, it, expectTypeOf } from "vitest";

import { StorefrontApiError, StorefrontTimeoutError } from "./errors";

describe("StorefrontApiError types", () => {
  it("does not expose GraphQL error fields; those live on result.errors", () => {
    const error = new StorefrontApiError("fail");

    expectTypeOf(error).not.toHaveProperty("locations");
    expectTypeOf(error).not.toHaveProperty("path");
    expectTypeOf(error).not.toHaveProperty("extensions");
    expectTypeOf(error.toJSON()).not.toHaveProperty("extensions");
    expectTypeOf<StorefrontTimeoutError>().not.toHaveProperty("extensions");
  });

  it("rejects GraphQL error fields in constructor options", () => {
    type ApiErrorOptions = NonNullable<ConstructorParameters<typeof StorefrontApiError>[1]>;
    type TimeoutErrorOptions = NonNullable<ConstructorParameters<typeof StorefrontTimeoutError>[1]>;

    expectTypeOf<ApiErrorOptions>().not.toHaveProperty("locations");
    expectTypeOf<ApiErrorOptions>().not.toHaveProperty("path");
    expectTypeOf<ApiErrorOptions>().not.toHaveProperty("extensions");
    expectTypeOf<TimeoutErrorOptions>().not.toHaveProperty("extensions");
  });
});
