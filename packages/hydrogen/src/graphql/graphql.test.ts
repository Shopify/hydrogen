import { readFileSync } from "node:fs";

import { buildSchema, parse, validate } from "graphql";
import { describe, it, expect } from "vitest";

import { gql } from "./graphql";

const schema = buildSchema(
  readFileSync(new URL("./generated/storefront.schema.graphql", import.meta.url), "utf8"),
);

function validationErrors(doc: unknown): string[] {
  return validate(schema, parse(doc as string)).map((error) => error.message);
}

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

  it("appends a sub-fragment once when two composed fragments both spread it", () => {
    const image = gql(`fragment Image on Image { url altText width height }`);
    const productCard = gql(
      `fragment ProductCard on Product { handle title featuredImage { ...Image } }`,
      [image],
    );
    const collectionCard = gql(
      `fragment CollectionCard on Collection { handle title image { ...Image } }`,
      [image],
    );
    const doc = gql(
      `query Home { collections(first: 2) { nodes { ...CollectionCard } } products(first: 2) { nodes { ...ProductCard } } }`,
      [productCard, collectionCard],
    );

    const queryText = doc as unknown as string;
    expect(queryText.split("fragment Image on Image").length - 1).toBe(1);
    expect(queryText.split("fragment ProductCard on Product").length - 1).toBe(1);
    expect(queryText.split("fragment CollectionCard on Collection").length - 1).toBe(1);
    expect(validationErrors(doc)).toEqual([]);
  });

  it("appends a sub-fragment once when the query also spreads it directly", () => {
    const money = gql(`fragment Money on MoneyV2 { amount currencyCode }`);
    const variant = gql(`fragment Variant on ProductVariant { id price { ...Money } }`, [money]);
    const doc = gql(
      `query Product { product(handle: "x") { priceRange { minVariantPrice { ...Money } } variants(first: 1) { nodes { ...Variant } } } }`,
      [money, variant],
    );

    const queryText = doc as unknown as string;
    expect(queryText.split("fragment Money on MoneyV2").length - 1).toBe(1);
    expect(validationErrors(doc)).toEqual([]);
  });

  it("keeps a fragment whose name appears in a comment", () => {
    const fields = gql(`fragment ShopFields on Shop { description }`);
    const doc = gql(
      `# spreads fragment ShopFields on Shop for the description\nquery ShopName { shop { name ...ShopFields } }`,
      [fields],
    );

    expect(validationErrors(doc)).toEqual([]);
  });

  it("throws when two fragments define the same name differently", () => {
    const image = gql(`fragment Image on Image { url }`);
    const otherImage = gql(`fragment Image on Image { altText }`);

    expect(() =>
      gql(`query Q { shop { brand { logo { image { ...Image } } } } }`, [image, otherImage]),
    ).toThrow('Fragment "Image" has two different definitions');
  });
});
