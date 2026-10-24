import { describe, expect, it } from "vitest";

import { appendFragments } from "./fragments";

const IMAGE = `fragment Image on Image { url altText }`;
const PRODUCT_CARD = `fragment ProductCard on Product { handle featuredImage { ...Image } }\n${IMAGE}`;
const COLLECTION_CARD = `fragment CollectionCard on Collection { handle image { ...Image } }\n${IMAGE}`;

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("appendFragments", () => {
  it("appends each fragment after the document on its own line", () => {
    expect(appendFragments("query { shop { name } }", [IMAGE])).toBe(
      `query { shop { name } }\n${IMAGE}`,
    );
  });

  it("appends a fragment that two composed fragments both carry once", () => {
    const query = appendFragments("query { a }", [PRODUCT_CARD, COLLECTION_CARD]);

    expect(count(query, "fragment Image on Image")).toBe(1);
    expect(count(query, "fragment ProductCard on Product")).toBe(1);
    expect(count(query, "fragment CollectionCard on Collection")).toBe(1);
  });

  it("skips a fragment the document itself defines", () => {
    const source = `query { shop { brand { logo { image { ...Image } } } } }\n${IMAGE}`;

    expect(appendFragments(source, [IMAGE])).toBe(source);
  });

  it("does not treat a hash in a string as a comment", () => {
    const source = `query Search { products(query: "#sale") { nodes { ...Card } } } fragment Card on Product { id }`;
    const card = `fragment Card on Product { id }`;

    const query = appendFragments(source, [card]);

    expect(count(query, "fragment Card on Product")).toBe(1);
  });

  it("detects conflicting definitions when a string contains a closing brace", () => {
    const query = `query Product { product(handle: "shirt") { ...Card } }`;
    const firstCard = `fragment Card on Product { metafield(namespace: "custom", key: "}") { value } }`;
    const extendedCard = `fragment Card on Product { metafield(namespace: "custom", key: "}") { value } handle }`;

    expect(() => appendFragments(query, [firstCard, extendedCard])).toThrow(
      'Fragment "Card" has two different definitions',
    );
  });

  it("recognizes the same definition whether a comment precedes it or another fragment follows it", () => {
    const commented = `# shared image fields\n${IMAGE}`;
    const card = `fragment Card on Product { ...Image price { ...Price } }\n${commented}\nfragment Price on MoneyV2 { amount }`;

    for (const fragments of [
      [card, commented],
      [commented, card],
    ]) {
      const query = appendFragments("query { a }", fragments);
      expect(count(query, "fragment Image on Image")).toBe(1);
      expect(count(query, "fragment Price on MoneyV2")).toBe(1);
      expect(query).toContain("# shared image fields");
    }
  });

  it("appends a text without a fragment definition once however often it is passed", () => {
    const note = `# selection notes`;

    expect(appendFragments("query { a }", [note, note])).toBe(`query { a }\n${note}`);
  });

  it("throws when two fragments define the same name differently", () => {
    const otherImage = `fragment Image on Image { width height }`;

    expect(() => appendFragments("query { a }", [IMAGE, otherImage])).toThrow(
      'Fragment "Image" has two different definitions',
    );
  });

  it("throws when a composed fragment carries a definition that differs from the document's own", () => {
    const source = `query { shop { brand { logo { image { ...Image } } } } }\nfragment Image on Image { width }`;

    expect(() => appendFragments(source, [PRODUCT_CARD])).toThrow('Fragment "Image"');
  });
});
