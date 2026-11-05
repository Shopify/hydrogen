import { describe, expect, it } from "vitest";

import { normalizeStorefrontLocale } from "./locale.ts";

describe("normalizeStorefrontLocale", () => {
  it("maps storefront values to ISO country and Storefront API language codes", () => {
    const cases: Array<[string, string, string, string]> = [
      ["US", "en", "US", "EN"],
      ["ca", "fr", "CA", "FR"],
      [" CA ", " en ", "CA", "EN"],
      ["US", "en-US", "US", "EN"],
      ["US", "en_us", "US", "EN"],
      ["BR", "pt-BR", "BR", "PT_BR"],
      ["PT", "pt-PT", "PT", "PT_PT"],
      ["AO", "pt-AO", "AO", "PT"],
      ["CN", "zh-CN", "CN", "ZH_CN"],
      ["TW", "zh-TW", "TW", "ZH_TW"],
      ["TW", "zh-Hant-TW", "TW", "ZH_TW"],
      ["CN", "zh", "CN", "ZH"],
      ["PH", "fil", "PH", "FIL"],
      ["IQ", "ckb", "IQ", "CKB"],
      ["MX", "es-419", "MX", "ES"],
    ];
    for (const [country, language, expectedCountry, expectedLanguage] of cases) {
      expect(normalizeStorefrontLocale({ country, language }), `${country} ${language}`).toEqual({
        country: expectedCountry,
        language: expectedLanguage,
      });
    }
  });

  it("rejects missing, ambiguous, and invalid values instead of guessing", () => {
    const cases: Array<{ country: unknown; language: unknown }> = [
      { country: undefined, language: "en" },
      { country: "US", language: undefined },
      { country: "", language: "en" },
      { country: "US", language: "" },
      { country: "USA", language: "en" },
      { country: "U1", language: "en" },
      { country: 1, language: "en" },
      { country: "US", language: "english" },
      { country: "US", language: "xx" },
      { country: "US", language: "en-" },
      { country: "US", language: "en US" },
      { country: "US", language: "EN_US_X" },
      { country: "US", language: { code: "en" } },
    ];
    for (const raw of cases) {
      expect(normalizeStorefrontLocale(raw), JSON.stringify(raw)).toBeUndefined();
    }
  });
});
