import { describe, expect, it } from "vitest";

import { getLocalizedPath, matchLocaleFromRequest } from "./locale-matching";
import type { SupportedLocale } from "./locale-matching";

const DEFAULT_LOCALE: SupportedLocale = { country: "US", language: "EN" };
const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  DEFAULT_LOCALE,
  { country: "CA", language: "EN" },
  { country: "CA", language: "FR" },
];

function matchPath(path: string, supportedLocales = SUPPORTED_LOCALES) {
  return matchLocaleFromRequest(new Request(`https://store.example${path}`), {
    defaultLocale: DEFAULT_LOCALE,
    supportedLocales,
  });
}

describe("matchLocaleFromRequest", () => {
  it("resolves unprefixed paths to the default locale", () => {
    expect(matchPath("/products/snowboard")).toEqual({
      country: "US",
      language: "EN",
      pathPrefix: "",
    });
  });

  it("matches a supported locale prefix", () => {
    expect(matchPath("/fr-ca/products/snowboard")).toEqual({
      country: "CA",
      language: "FR",
      pathPrefix: "/fr-ca",
    });
  });

  it("matches prefixes case-insensitively and returns the canonical lowercase prefix", () => {
    expect(matchPath("/FR-CA/products")).toEqual({
      country: "CA",
      language: "FR",
      pathPrefix: "/fr-ca",
    });
  });

  it("matches a prefix-only path, with and without a trailing slash", () => {
    expect(matchPath("/fr-ca").pathPrefix).toBe("/fr-ca");
    expect(matchPath("/fr-ca/").pathPrefix).toBe("/fr-ca");
  });

  it("resolves locale-shaped but unsupported prefixes to the default locale", () => {
    expect(matchPath("/de-de/products").pathPrefix).toBe("");
    expect(matchPath("/fr-fr/products").pathPrefix).toBe("");
  });

  it("resolves malformed prefixes to the default locale", () => {
    expect(matchPath("/fr/products").pathPrefix).toBe("");
    expect(matchPath("/fr_ca/products").pathPrefix).toBe("");
    expect(matchPath("/notalocale/products").pathPrefix).toBe("");
    expect(matchPath("/fr-cassis/products").pathPrefix).toBe("");
  });

  it("serves the default locale only unprefixed — its own prefix does not match", () => {
    expect(matchPath("/en-us/products")).toEqual({
      country: "US",
      language: "EN",
      pathPrefix: "",
    });
  });

  it("ignores search params and hash", () => {
    expect(matchPath("/fr-ca/products?sort=price#reviews").pathPrefix).toBe("/fr-ca");
  });

  it("canonicalizes underscore language codes into hyphenated prefixes", () => {
    const locales: readonly SupportedLocale[] = [{ country: "BR", language: "PT_BR" }];
    expect(matchPath("/pt-br-br/products", locales)).toEqual({
      country: "BR",
      language: "PT_BR",
      pathPrefix: "/pt-br-br",
    });
  });

  it("resolves everything to the default locale when supportedLocales is empty", () => {
    expect(matchPath("/fr-ca/products", []).pathPrefix).toBe("");
  });

  describe("permissive mode (no supportedLocales)", () => {
    function matchPathPermissive(path: string) {
      return matchLocaleFromRequest(new Request(`https://store.example${path}`), {
        defaultLocale: DEFAULT_LOCALE,
      });
    }

    it("matches any valid ISO pair, even ones no list mentions", () => {
      expect(matchPathPermissive("/de-de/products")).toEqual({
        country: "DE",
        language: "DE",
        pathPrefix: "/de-de",
      });
    });

    it("matches case-insensitively with a canonical lowercase prefix", () => {
      expect(matchPathPermissive("/FR-CA/products").pathPrefix).toBe("/fr-ca");
    });

    it("parses underscore language codes from hyphenated prefixes", () => {
      expect(matchPathPermissive("/pt-br-br/products")).toEqual({
        country: "BR",
        language: "PT_BR",
        pathPrefix: "/pt-br-br",
      });
      expect(matchPathPermissive("/pt-br/products")).toEqual({
        country: "BR",
        language: "PT",
        pathPrefix: "/pt-br",
      });
    });

    it("rejects prefixes with an unknown country code", () => {
      expect(matchPathPermissive("/fr-qq/products").pathPrefix).toBe("");
      expect(matchPathPermissive("/fr-cassis/products").pathPrefix).toBe("");
    });

    it("rejects prefixes with an unknown language code", () => {
      expect(matchPathPermissive("/qq-ca/products").pathPrefix).toBe("");
      expect(matchPathPermissive("/a-b-c-d/products").pathPrefix).toBe("");
    });

    it("rejects segments without a separator", () => {
      expect(matchPathPermissive("/products").pathPrefix).toBe("");
    });

    it("serves the default locale only unprefixed", () => {
      expect(matchPathPermissive("/en-us/products")).toEqual({
        country: "US",
        language: "EN",
        pathPrefix: "",
      });
    });

    it("round-trips with getLocalizedPath", () => {
      const matched = matchPathPermissive("/de-de/products");
      const localizedPath = getLocalizedPath("/collections/all", {
        fromPathPrefix: "",
        toPathPrefix: matched.pathPrefix,
      });
      expect(matchPathPermissive(localizedPath)).toEqual(matched);
    });
  });

  it("round-trips with getLocalizedPath for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const pathPrefix = localePrefixFixture(locale);
      const localizedPath = getLocalizedPath("/products/snowboard", {
        fromPathPrefix: "",
        toPathPrefix: pathPrefix,
      });
      expect(matchPath(localizedPath)).toEqual({ ...locale, pathPrefix });
    }
  });
});

/** Canonical path prefix for a locale; empty for the default locale. */
function localePrefixFixture(locale: SupportedLocale): string {
  const isDefault =
    locale.country === DEFAULT_LOCALE.country && locale.language === DEFAULT_LOCALE.language;
  return isDefault ? "" : `/${locale.language}-${locale.country}`.toLowerCase();
}

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
