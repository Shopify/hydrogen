import { describe, it, expect } from "vitest";

import { gql } from "./graphql";

describe("gql", () => {
  it("returns a string", () => {
    const doc = gql(`query { shop { name } }`);
    expect(typeof doc).toBe("string");
  });

  it("preserves the query text verbatim", () => {
    const doc = gql(`query ShopName { shop { name } }`);
    expect(doc as unknown as string).toBe("query ShopName { shop { name } }");
  });

  it("concatenates fragment sources into the query string", () => {
    const fragment = gql(`fragment ProductFields on Product { title handle }`);
    const doc = gql(
      `query GetProduct($handle: String!) { product(handle: $handle) { ...ProductFields } }`,
      [fragment],
    );

    const queryText = doc as unknown as string;
    expect(queryText).toContain("query GetProduct");
    expect(queryText).toContain("fragment ProductFields on Product");
  });

  it("concatenates fragments when the source is already a StorefrontQueryString", () => {
    const source = gql(`query ShopName { shop { name ...ShopFields } }`);
    const fragment = gql(`fragment ShopFields on Shop { description }`);
    const doc = gql(source, [fragment]);

    const queryText = doc as unknown as string;
    expect(queryText).toContain("query ShopName");
    expect(queryText).toContain("fragment ShopFields on Shop");
  });

  it("deduplicates identical fragments", () => {
    const fragment = gql(`fragment PriceFields on MoneyV2 { amount currencyCode }`);
    const doc = gql(
      `query GetPrices { product(id: "1") { priceRange { minVariantPrice { ...PriceFields } maxVariantPrice { ...PriceFields } } } }`,
      [fragment, fragment],
    );

    const queryText = doc as unknown as string;
    const occurrences = queryText.split("fragment PriceFields").length - 1;
    expect(occurrences).toBe(1);
  });
});
