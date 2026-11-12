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

  it("finds a definition that follows a string containing `#` on the same line", () => {
    const source = `query { search(query: "#tag") { id } } ${IMAGE}`;

    expect(appendFragments(source, [IMAGE])).toBe(source);
  });

  it("throws when two definitions differ after a string containing `}`", () => {
    const first = `fragment P on Product { metafield(namespace: "x}", key: "a") { value } }`;
    const second = `fragment P on Product { metafield(namespace: "x}", key: "b") { value } }`;

    expect(() => appendFragments("query { a }", [first, second])).toThrow('Fragment "P"');
  });

  it("appends one copy of a shared fragment that contains a string with `{`", () => {
    const shared = `fragment F on Product { metafield(namespace: "{x", key: "a") { value } }`;
    const withTrailing = `fragment A on Product { ...F ...G }\n${shared}\nfragment G on Product { id }`;
    const withoutTrailing = `fragment B on Product { ...F }\n${shared}`;

    const query = appendFragments("query { a }", [withTrailing, withoutTrailing]);

    expect(count(query, "fragment F on Product")).toBe(1);
    expect(count(query, "fragment B on Product")).toBe(1);
  });

  it.each([
    ["a string", `query { search(query: "fragment Image on Image") { id } }`],
    ["a block string", `query { search(query: """fragment Image on Image { id }""") { id } }`],
  ])("ignores fragment syntax inside %s", (_, source) => {
    expect(appendFragments(source, [IMAGE])).toBe(`${source}\n${IMAGE}`);
  });

  it("appends one copy of a fragment whose definitions differ only in formatting", () => {
    const reformatted = `fragment Image on Image {\n  url\n  # alt text for screen readers\n  altText\n}`;

    const query = appendFragments("query { a }", [IMAGE, reformatted]);

    expect(query).toBe(`query { a }\n${IMAGE}`);
  });

  it("appends only the new definitions of a text that repeats a known one, as written", () => {
    expect(appendFragments("query { a }", [PRODUCT_CARD, COLLECTION_CARD])).toBe(
      `query { a }\n${PRODUCT_CARD}\nfragment CollectionCard on Collection { handle image { ...Image } }`,
    );
  });

  it.each([
    ["an escaped quote", String.raw`"say \"{\""`],
    ["an escaped block quote", String.raw`"""say \""" {"""`],
  ])("reads a string with %s as one token", (_, value) => {
    const shared = `fragment F on Product { metafield(namespace: ${value}, key: "a") { value } }`;
    const first = `fragment A on Product { ...F }\n${shared}`;
    const second = `fragment B on Product { ...F }\n${shared}`;

    const query = appendFragments("query { a }", [first, second]);

    expect(count(query, "fragment F on Product")).toBe(1);
    expect(count(query, "fragment B on Product")).toBe(1);
  });

  it.each([
    ["an unclosed brace", `fragment Broken on Image {`],
    ["an unclosed string", `fragment Broken on Image { url(transform: "x) }`],
  ])("appends a text with %s as written, once", (_, unparseable) => {
    expect(appendFragments("query { a }", [unparseable, unparseable])).toBe(
      `query { a }\n${unparseable}`,
    );
  });
});
