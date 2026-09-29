import { describe, expect, it } from "vitest";

import { getCanonicalUrl, getLanguageAlternates } from "./canonical";

describe("getCanonicalUrl", () => {
  it("drops variant selection params", () => {
    expect(getCanonicalUrl("https://example.com/products/snowboard?Color=Red&Size=M")).toBe(
      "https://example.com/products/snowboard",
    );
  });

  it("drops filters, sort keys, cursors, tracking params, and the hash", () => {
    expect(
      getCanonicalUrl(
        "https://example.com/collections/winter?filter.v.availability=1&sort_by=price&cursor=abc&utm_source=x#top",
      ),
    ).toBe("https://example.com/collections/winter");
  });

  it("keeps listed params and sorts them", () => {
    expect(
      getCanonicalUrl("https://example.com/search?utm_source=x&q=board&page=2", {
        keepSearchParams: ["q", "page"],
      }),
    ).toBe("https://example.com/search?page=2&q=board");
  });

  it("replaces the request origin with the trusted origin", () => {
    expect(
      getCanonicalUrl("http://internal.host:8080/products/snowboard", {
        origin: "https://example.com",
      }),
    ).toBe("https://example.com/products/snowboard");
  });

  it("ignores any path on the trusted origin", () => {
    expect(
      getCanonicalUrl("https://example.com/products/snowboard", {
        origin: "https://example.com/ignored/",
      }),
    ).toBe("https://example.com/products/snowboard");
  });

  it("removes a trailing slash by default and keeps the root slash", () => {
    expect(getCanonicalUrl("https://example.com/collections/")).toBe(
      "https://example.com/collections",
    );
    expect(getCanonicalUrl("https://example.com/")).toBe("https://example.com/");
    expect(getCanonicalUrl("https://example.com")).toBe("https://example.com/");
  });

  it("adds a trailing slash when requested", () => {
    expect(getCanonicalUrl("https://example.com/collections", { trailingSlash: true })).toBe(
      "https://example.com/collections/",
    );
    expect(getCanonicalUrl("https://example.com/", { trailingSlash: true })).toBe(
      "https://example.com/",
    );
  });

  it("accepts a URL instance", () => {
    expect(getCanonicalUrl(new URL("https://example.com/a?b=c"))).toBe("https://example.com/a");
  });
});

describe("getLanguageAlternates", () => {
  const locales = [
    { hrefLang: "en-US" },
    { hrefLang: "fr-CA", pathPrefix: "/fr-ca" },
    { hrefLang: "es", pathPrefix: "es" },
  ];

  it("swaps the current locale prefix for each locale's prefix", () => {
    expect(
      getLanguageAlternates("https://example.com/fr-ca/products/snowboard?Color=Red", {
        currentPathPrefix: "/fr-ca",
        locales,
      }),
    ).toEqual([
      { hrefLang: "en-US", href: "https://example.com/products/snowboard" },
      { hrefLang: "fr-CA", href: "https://example.com/fr-ca/products/snowboard" },
      { hrefLang: "es", href: "https://example.com/es/products/snowboard" },
    ]);
  });

  it("handles the default locale with no prefix and the root path", () => {
    expect(getLanguageAlternates("https://example.com/", { locales })).toEqual([
      { hrefLang: "en-US", href: "https://example.com/" },
      { hrefLang: "fr-CA", href: "https://example.com/fr-ca/" },
      { hrefLang: "es", href: "https://example.com/es/" },
    ]);
  });

  it("emits x-default for the named locale", () => {
    const alternates = getLanguageAlternates("https://example.com/products/snowboard", {
      locales,
      xDefault: "en-US",
    });

    expect(alternates.at(-1)).toEqual({
      hrefLang: "x-default",
      href: "https://example.com/products/snowboard",
    });
  });

  it("ignores an x-default that names no locale", () => {
    const alternates = getLanguageAlternates("https://example.com/", {
      locales,
      xDefault: "de-DE",
    });

    expect(alternates.some((alternate) => alternate.hrefLang === "x-default")).toBe(false);
  });

  it("uses the trusted origin", () => {
    expect(
      getLanguageAlternates("http://localhost:3000/es/collections", {
        currentPathPrefix: "/es",
        origin: "https://example.com",
        locales: [{ hrefLang: "en-US" }],
      }),
    ).toEqual([{ hrefLang: "en-US", href: "https://example.com/collections" }]);
  });
});
