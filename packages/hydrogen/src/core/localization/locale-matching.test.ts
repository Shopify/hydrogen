import { describe, expect, it } from "vitest";

import { getLocalizedPath } from "./locale-matching";

describe("getLocalizedPath", () => {
  it("swaps one locale prefix for another", () => {
    expect(
      getLocalizedPath("/fr-ca/products/snowboard", {
        fromPathPrefix: "/fr-ca",
        toPathPrefix: "/en-ca",
      }),
    ).toBe("/en-ca/products/snowboard");
  });

  it("applies a prefix to an unprefixed path (default locale source)", () => {
    expect(
      getLocalizedPath("/products/snowboard", { fromPathPrefix: "", toPathPrefix: "/fr-ca" }),
    ).toBe("/fr-ca/products/snowboard");
  });

  it("strips the prefix when targeting the default locale", () => {
    expect(
      getLocalizedPath("/fr-ca/products/snowboard", { fromPathPrefix: "/fr-ca", toPathPrefix: "" }),
    ).toBe("/products/snowboard");
  });

  it("preserves search params and hash", () => {
    expect(
      getLocalizedPath("/fr-ca/collections/shoes?sort=price&page=2#reviews", {
        fromPathPrefix: "/fr-ca",
        toPathPrefix: "/en-ca",
      }),
    ).toBe("/en-ca/collections/shoes?sort=price&page=2#reviews");
  });

  it("preserves a hash-only suffix", () => {
    expect(
      getLocalizedPath("/fr-ca/about#team", { fromPathPrefix: "/fr-ca", toPathPrefix: "" }),
    ).toBe("/about#team");
  });

  it("localizes the root path without a trailing slash artifact", () => {
    expect(getLocalizedPath("/", { fromPathPrefix: "", toPathPrefix: "/fr-ca" })).toBe("/fr-ca");
    expect(getLocalizedPath("/fr-ca", { fromPathPrefix: "/fr-ca", toPathPrefix: "" })).toBe("/");
    expect(getLocalizedPath("/fr-ca", { fromPathPrefix: "/fr-ca", toPathPrefix: "/en-ca" })).toBe(
      "/en-ca",
    );
  });

  it("preserves search params on the root path", () => {
    expect(getLocalizedPath("/?utm=a", { fromPathPrefix: "", toPathPrefix: "/fr-ca" })).toBe(
      "/fr-ca?utm=a",
    );
  });

  it("matches the source prefix case-insensitively", () => {
    expect(
      getLocalizedPath("/FR-CA/products/snowboard", { fromPathPrefix: "/fr-ca", toPathPrefix: "" }),
    ).toBe("/products/snowboard");
  });

  it("normalizes unnormalized prefixes", () => {
    expect(
      getLocalizedPath("/fr-ca/products", { fromPathPrefix: "fr-ca/", toPathPrefix: "en-ca" }),
    ).toBe("/en-ca/products");
  });

  it("leaves the path untouched when the source prefix is not present", () => {
    expect(
      getLocalizedPath("/products/snowboard", { fromPathPrefix: "/fr-ca", toPathPrefix: "/en-ca" }),
    ).toBe("/en-ca/products/snowboard");
  });

  it("does not strip a prefix that only partially matches a segment", () => {
    expect(
      getLocalizedPath("/fr-cassis/products", { fromPathPrefix: "/fr-ca", toPathPrefix: "" }),
    ).toBe("/fr-cassis/products");
  });

  it("returns the same path when both prefixes are empty", () => {
    expect(getLocalizedPath("/products/snowboard", { fromPathPrefix: "", toPathPrefix: "" })).toBe(
      "/products/snowboard",
    );
  });
});
