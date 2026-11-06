import { describe, expectTypeOf, it } from "vitest";

import {
  defineShopifyI18n,
  getSupportedLocales,
  matchLocale,
  resolveSupportedLocale,
  type ShopifyI18n,
  type ShopifyMatchedLocale,
  type ShopifySupportedLocale,
} from "./index";

const EN_US = { language: "EN", country: "US" } as const;
const FR_CA = { language: "FR", country: "CA" } as const;

const singleLocale = defineShopifyI18n({ defaultLocale: EN_US });

const pathnameI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "pathname",
    locales: [FR_CA, { language: "PT_BR", country: "BR", pathSegment: "br", currency: "BRL" }],
  },
});

const domainI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "domain",
    locales: [
      { ...EN_US, hostname: "example.com" },
      { ...FR_CA, hostname: "fr.example.ca" },
    ],
  },
});

describe("ShopifySupportedLocale", () => {
  it("is only the default without routing", () => {
    expectTypeOf<ShopifySupportedLocale<typeof singleLocale>>().toEqualTypeOf<typeof EN_US>();
  });

  it("unions the default with the prefixed entries under pathname routing", () => {
    expectTypeOf<ShopifySupportedLocale<typeof pathnameI18n>>().toEqualTypeOf<
      | typeof EN_US
      | typeof FR_CA
      | { readonly language: "PT_BR"; readonly country: "BR"; readonly pathSegment: "br"; readonly currency: "BRL" }
    >();
  });

  it("is only the routing entries under domain routing, so hostname is always present", () => {
    type Supported = ShopifySupportedLocale<typeof domainI18n>;
    expectTypeOf<Supported["hostname"]>().toEqualTypeOf<"example.com" | "fr.example.ca">();
    expectTypeOf(getSupportedLocales(domainI18n)[0].hostname).toEqualTypeOf<
      "example.com" | "fr.example.ca"
    >();
  });

  it("keeps routing entry fields for the broad ShopifyI18n type", () => {
    type Broad = ShopifySupportedLocale<ShopifyI18n>;
    expectTypeOf<Extract<Broad, { hostname: string }>>().not.toBeNever();
    expectTypeOf<Extract<Broad, { pathSegment?: string }>>().not.toBeNever();
  });
});

describe("resolveSupportedLocale", () => {
  it("returns the same matched type for a locale and for its path segment", () => {
    expectTypeOf(resolveSupportedLocale("fr-ca", domainI18n)).toEqualTypeOf(
      resolveSupportedLocale(FR_CA, domainI18n),
    );
    expectTypeOf(resolveSupportedLocale("fr-ca", domainI18n).hostname).toEqualTypeOf<
      "example.com" | "fr.example.ca"
    >();
  });
});

describe("ShopifyMatchedLocale", () => {
  it("exposes hostname on matched domain locales", () => {
    const matched = matchLocale("https://fr.example.ca/", domainI18n);
    expectTypeOf(matched.hostname).toEqualTypeOf<"example.com" | "fr.example.ca">();
    expectTypeOf(matched.pathPrefix).toEqualTypeOf<string>();
  });

  it("drops pathSegment and keeps extra fields on matched pathname locales", () => {
    const matched = matchLocale("https://example.com/br", pathnameI18n);
    expectTypeOf<ShopifyMatchedLocale<typeof pathnameI18n>>().toEqualTypeOf<typeof matched>();
    expectTypeOf<Extract<typeof matched, { currency: "BRL" }>["currency"]>().toEqualTypeOf<"BRL">();
    expectTypeOf<Extract<typeof matched, { pathSegment: string }>>().toBeNever();
  });
});
