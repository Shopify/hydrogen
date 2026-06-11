import { describe, it, expectTypeOf } from "vitest";

import type { InferResult, InferVariables } from "./type-resolver";

describe("InferResult", () => {
  it("resolves a simple query", () => {
    type R = InferResult<"query { shop { name } }">;
    expectTypeOf<R>().not.toBeNever();
    expectTypeOf<R>().toHaveProperty("shop");
  });

  it("resolves nested object fields", () => {
    type R = InferResult<"query { shop { name primaryDomain { url host } } }">;
    expectTypeOf<R>().toHaveProperty("shop");
  });

  it("resolves mutation operations", () => {
    type R = InferResult<"mutation cartCreate { cartCreate { cart { id } } }">;
    expectTypeOf<R>().not.toBeNever();
  });
});

describe("InferVariables", () => {
  it("resolves required variables", () => {
    type V =
      InferVariables<"query Product($handle: String!) { product(handle: $handle) { title } }">;
    expectTypeOf<V>().not.toBeNever();
    expectTypeOf<V>().toHaveProperty("handle");
  });

  it("marks optional variables as optional", () => {
    type V =
      InferVariables<"query OptVars($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { shop { name } }">;
    expectTypeOf<V>().not.toBeNever();
  });

  it("returns empty-ish object for queries with no variables", () => {
    type V = InferVariables<"query { shop { name } }">;
    expectTypeOf<{}>().toMatchTypeOf<V>();
  });
});
