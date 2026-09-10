import { describe, expect, it } from "vitest";

import {
  defineShopifyI18n,
  getLocalizedHref,
  getSupportedLocales,
  matchLocale,
  resolveSupportedLocale,
} from "./index";

const EN_US = { language: "EN", country: "US" } as const;
const FR_CA = { language: "FR", country: "CA" } as const;
const PT_BR = { language: "PT_BR", country: "BR" } as const;

const singleLocale = defineShopifyI18n({ defaultLocale: EN_US });

const pathnameI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "pathname",
    locales: [FR_CA, { ...PT_BR, pathSegment: "BR", currency: "BRL" }],
  },
});

const domainI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "domain",
    locales: [
      { ...EN_US, hostname: "example.com" },
      { ...FR_CA, hostname: "FR.example.ca" },
    ],
  },
});

describe("defineShopifyI18n", () => {
  it("returns the definition unchanged", () => {
    const input = { defaultLocale: EN_US };
    expect(defineShopifyI18n(input)).toBe(input);
  });

  it("requires language and country on the default locale", () => {
    expect(() => defineShopifyI18n({ defaultLocale: { language: "EN" } as never })).toThrowError(
      /defaultLocale requires both "language" and "country"/,
    );
  });

  it("rejects empty routing locales", () => {
    expect(() =>
      defineShopifyI18n({ defaultLocale: EN_US, routing: { type: "pathname", locales: [] } }),
    ).toThrowError(/routing.locales is empty/);
  });

  describe("pathname routing", () => {
    it("rejects the default locale in the prefixed list", () => {
      expect(() =>
        defineShopifyI18n({
          defaultLocale: EN_US,
          routing: { type: "pathname", locales: [EN_US, FR_CA] },
        }),
      ).toThrowError(/must not appear in pathname routing.locales/);
    });

    it("rejects duplicate locales", () => {
      expect(() =>
        defineShopifyI18n({
          defaultLocale: EN_US,
          routing: { type: "pathname", locales: [FR_CA, { ...FR_CA, pathSegment: "fr" }] },
        }),
      ).toThrowError(/listed more than once/);
    });

    it("rejects path segments containing slashes or whitespace", () => {
      for (const pathSegment of ["/br", "br/", "b r", "", "  "]) {
        expect(() =>
          defineShopifyI18n({
            defaultLocale: EN_US,
            routing: { type: "pathname", locales: [{ ...PT_BR, pathSegment }] },
          }),
        ).toThrowError(/invalid pathSegment/);
      }
    });

    it("rejects segment collisions between custom and derived prefixes", () => {
      expect(() =>
        defineShopifyI18n({
          defaultLocale: EN_US,
          routing: {
            type: "pathname",
            locales: [FR_CA, { language: "EN", country: "CA", pathSegment: "FR-CA" }],
          },
        }),
      ).toThrowError(/both resolve to the path segment "fr-ca"/);
    });
  });

  describe("domain routing", () => {
    it("requires the default locale to have a hostname", () => {
      expect(() =>
        defineShopifyI18n({
          defaultLocale: EN_US,
          routing: { type: "domain", locales: [{ ...FR_CA, hostname: "fr.example.ca" }] },
        }),
      ).toThrowError(/must appear in domain routing.locales/);
    });

    it("rejects hostnames carrying a scheme, port, or path", () => {
      for (const hostname of ["https://example.com", "example.com:5173", "example.com/fr", ""]) {
        expect(() =>
          defineShopifyI18n({
            defaultLocale: EN_US,
            routing: { type: "domain", locales: [{ ...EN_US, hostname }] },
          }),
        ).toThrowError(/invalid hostname/);
      }
    });

    it("rejects one hostname mapped to two locales", () => {
      expect(() =>
        defineShopifyI18n({
          defaultLocale: EN_US,
          routing: {
            type: "domain",
            locales: [
              { ...EN_US, hostname: "example.com" },
              { ...FR_CA, hostname: "EXAMPLE.com" },
            ],
          },
        }),
      ).toThrowError(/both use hostname "example.com"/);
    });
  });
});

describe("getSupportedLocales", () => {
  it("returns only the default for single-locale definitions", () => {
    expect(getSupportedLocales(singleLocale)).toEqual([EN_US]);
  });

  it("lists the default first under pathname routing, keeping entry fields", () => {
    expect(getSupportedLocales(pathnameI18n)).toEqual([
      EN_US,
      FR_CA,
      { ...PT_BR, pathSegment: "BR", currency: "BRL" },
    ]);
  });

  it("lists domain entries with their hostnames", () => {
    expect(getSupportedLocales(domainI18n)).toEqual([
      { ...EN_US, hostname: "example.com" },
      { ...FR_CA, hostname: "FR.example.ca" },
    ]);
  });

  it("moves the default's domain entry to the front regardless of definition order", () => {
    const i18n = defineShopifyI18n({
      defaultLocale: EN_US,
      routing: {
        type: "domain",
        locales: [
          { ...FR_CA, hostname: "fr.example.ca" },
          { ...EN_US, hostname: "example.com" },
        ],
      },
    });

    expect(getSupportedLocales(i18n)).toEqual([
      { ...EN_US, hostname: "example.com" },
      { ...FR_CA, hostname: "fr.example.ca" },
    ]);
  });
});

describe("matchLocale", () => {
  it("always resolves the default without routing", () => {
    expect(matchLocale(new Request("https://example.com/fr-ca/products/x"), singleLocale)).toEqual({
      ...EN_US,
      pathPrefix: "",
    });
  });

  describe("pathname routing", () => {
    it.each([
      ["https://example.com/", { ...EN_US, pathPrefix: "" }],
      ["https://example.com/products/x", { ...EN_US, pathPrefix: "" }],
      ["https://example.com/fr-ca", { ...FR_CA, pathPrefix: "/fr-ca" }],
      ["https://example.com/FR-CA/products/x.data", { ...FR_CA, pathPrefix: "/fr-ca" }],
      // Framework suffixes on the locale segment itself are the caller's job to normalize.
      ["https://example.com/fr-ca.data", { ...EN_US, pathPrefix: "" }],
      ["https://example.com/br/products/x", { ...PT_BR, currency: "BRL", pathPrefix: "/br" }],
      ["https://example.com/pt-br-br/products/x", { ...EN_US, pathPrefix: "" }],
      ["https://example.com/en-us/products/x", { ...EN_US, pathPrefix: "" }],
      ["https://example.com/fr-ca-products/x", { ...EN_US, pathPrefix: "" }],
    ])("resolves %s", (url, expected) => {
      expect(matchLocale(new Request(url), pathnameI18n)).toEqual(expected);
    });

    it("drops the routing key from the matched locale", () => {
      const matched = matchLocale("https://example.com/br", pathnameI18n);
      expect(matched).not.toHaveProperty("pathSegment");
    });
  });

  describe("domain routing", () => {
    it.each([
      ["https://example.com/products/x", { ...EN_US, hostname: "example.com", pathPrefix: "" }],
      [
        "https://fr.example.ca:5173/products/x",
        { ...FR_CA, hostname: "FR.example.ca", pathPrefix: "" },
      ],
      [
        "https://FR.EXAMPLE.CA/fr-ca/products/x",
        { ...FR_CA, hostname: "FR.example.ca", pathPrefix: "" },
      ],
      ["http://localhost:3000/products/x", { ...EN_US, hostname: "example.com", pathPrefix: "" }],
    ])("resolves %s", (url, expected) => {
      expect(matchLocale(url, domainI18n)).toEqual(expected);
    });

    it("keeps the hostname on the matched locale for canonical URLs", () => {
      expect(matchLocale("https://example.com/", domainI18n)).toHaveProperty(
        "hostname",
        "example.com",
      );
    });
  });

  it("falls back to the default for unparsable or missing URLs", () => {
    expect(matchLocale("not a url", pathnameI18n)).toEqual({ ...EN_US, pathPrefix: "" });
    expect(matchLocale(undefined, pathnameI18n)).toEqual({ ...EN_US, pathPrefix: "" });
  });

  it("accepts a URL instance", () => {
    expect(matchLocale(new URL("https://example.com/fr-ca/x"), pathnameI18n)).toEqual({
      ...FR_CA,
      pathPrefix: "/fr-ca",
    });
  });
});

describe("resolveSupportedLocale", () => {
  it("resolves the default locale with an empty prefix", () => {
    expect(resolveSupportedLocale(EN_US, pathnameI18n)).toEqual({ ...EN_US, pathPrefix: "" });
  });

  it("resolves a prefixed locale with its derived prefix", () => {
    expect(resolveSupportedLocale(PT_BR, pathnameI18n)).toEqual({
      ...PT_BR,
      currency: "BRL",
      pathPrefix: "/br",
    });
  });

  it("resolves a domain locale with its hostname and no prefix", () => {
    expect(resolveSupportedLocale(FR_CA, domainI18n)).toEqual({
      ...FR_CA,
      hostname: "FR.example.ca",
      pathPrefix: "",
    });
  });

  it("throws for locales outside the definition", () => {
    expect(() =>
      resolveSupportedLocale({ language: "DE", country: "DE" }, pathnameI18n),
    ).toThrowError(/DE-DE is not defined.*Supported locales: EN-US, FR-CA, PT_BR-BR/);
  });
});

describe("getLocalizedHref", () => {
  it("returns the href unchanged without routing", () => {
    expect(getLocalizedHref("/products/x?a=1", { i18n: singleLocale, locale: EN_US })).toBe(
      "/products/x?a=1",
    );
  });

  describe("pathname routing", () => {
    it.each([
      ["/products/x", FR_CA, "/fr-ca/products/x"],
      ["/products/x?variant=1#top", PT_BR, "/br/products/x?variant=1#top"],
      ["/fr-ca/products/x", PT_BR, "/br/products/x"],
      ["/FR-CA/products/x", EN_US, "/products/x"],
      ["/fr-ca", EN_US, "/"],
      ["/fr-ca/", EN_US, "/"],
      ["/", FR_CA, "/fr-ca"],
      ["/en-us/products/x", FR_CA, "/fr-ca/en-us/products/x"],
    ])("rewrites %s to %o", (href, locale, expected) => {
      expect(getLocalizedHref(href, { i18n: pathnameI18n, locale })).toBe(expected);
    });

    it("keeps the origin of absolute hrefs", () => {
      expect(
        getLocalizedHref("https://example.com/products/x", { i18n: pathnameI18n, locale: FR_CA }),
      ).toBe("https://example.com/fr-ca/products/x");
    });

    it("throws for locales outside the definition", () => {
      expect(() =>
        getLocalizedHref("/products/x", {
          i18n: pathnameI18n,
          locale: { language: "DE", country: "DE" },
        }),
      ).toThrowError(/DE-DE is not defined/);
    });
  });

  describe("domain routing", () => {
    it("returns an absolute https URL on the target hostname for relative hrefs", () => {
      expect(getLocalizedHref("/products/x?a=1", { i18n: domainI18n, locale: FR_CA })).toBe(
        "https://fr.example.ca/products/x?a=1",
      );
    });

    it("keeps the scheme of absolute hrefs and drops the port", () => {
      expect(
        getLocalizedHref("http://localhost:3000/products/x", { i18n: domainI18n, locale: EN_US }),
      ).toBe("http://example.com/products/x");
    });
  });
});
