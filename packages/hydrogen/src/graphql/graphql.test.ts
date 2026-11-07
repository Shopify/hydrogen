import { describe, it, expect } from "vitest";

import { gql } from "./graphql";

describe("gql", () => {
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

  it("includes a fragment shared by two composed fragments once", () => {
    const image = gql(`fragment ImageFields on Image { url }`);
    const featured = gql(`fragment Featured on Product { featuredImage { ...ImageFields } }`, [
      image,
    ]);
    const gallery = gql(
      `fragment Gallery on Product { images(first: 1) { nodes { ...ImageFields } } }`,
      [image],
    );
    const doc = gql(`query Product { product(handle: "x") { ...Featured ...Gallery } }`, [
      featured,
      gallery,
    ]);

    expect(doc as unknown as string).toBe(
      [
        `query Product { product(handle: "x") { ...Featured ...Gallery } }`,
        `fragment Featured on Product { featuredImage { ...ImageFields } }`,
        `fragment ImageFields on Image { url }`,
        `fragment Gallery on Product { images(first: 1) { nodes { ...ImageFields } } }`,
      ].join("\n"),
    );
  });

  it("skips fragments that a composed source already contains", () => {
    const fragment = gql(`fragment ShopFields on Shop { description }`);
    const source = gql(`query ShopName { shop { name ...ShopFields } }`, [fragment]);
    const doc = gql(source, [fragment]);

    expect(doc as unknown as string).toBe(
      `query ShopName { shop { name ...ShopFields } }\nfragment ShopFields on Shop { description }`,
    );
  });

  it("splits definitions at braces outside strings and comments", () => {
    const fragment = gql(
      `fragment Promo on Product {\n  # }\n  metafield(namespace: "}", key: """{""") { value }\n}`,
    );
    const doc = gql(`query Promo { product(handle: "x") { ...Promo } }`, [fragment, fragment]);

    expect(doc as unknown as string).toBe(
      `query Promo { product(handle: "x") { ...Promo } }\n${fragment as unknown as string}`,
    );
  });
});
