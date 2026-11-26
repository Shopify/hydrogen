import { describe, expectTypeOf, it } from "vitest";

import { defineShopifyI18n } from "../core/i18n/index";
import type { ShopifyRequestContext } from "../core/request-context";
import type { LocaleProviderProps } from "./locale";

const EN_US = { language: "EN", country: "US" } as const;

const pathnameI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "pathname",
    locales: [
      { language: "FR", country: "CA" },
      { language: "PT_BR", country: "BR", pathSegment: "br", currency: "BRL" },
    ],
  },
});

const domainI18n = defineShopifyI18n({
  defaultLocale: EN_US,
  routing: {
    type: "domain",
    locales: [
      { ...EN_US, hostname: "example.com" },
      { language: "FR", country: "CA", hostname: "fr.example.ca" },
    ],
  },
});

type LegacyFixedLocale = { language: "FR"; country: "CA"; pathPrefix: "/fr-ca" };

describe("LocaleProvider", () => {
  it("accepts the locale of a request context, whatever the i18n definition", () => {
    type Locale = LocaleProviderProps["locale"];

    expectTypeOf<ShopifyRequestContext<typeof pathnameI18n>["locale"]>().toExtend<Locale>();
    expectTypeOf<ShopifyRequestContext<typeof domainI18n>["locale"]>().toExtend<Locale>();
    expectTypeOf<ShopifyRequestContext<LegacyFixedLocale>["locale"]>().toExtend<Locale>();
  });

  it("rejects a locale without a path prefix", () => {
    expectTypeOf<typeof EN_US>().not.toExtend<LocaleProviderProps["locale"]>();
  });
});
