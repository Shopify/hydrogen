import { describe, expect, it } from "vitest";

import { gql } from "../../graphql";
import { localizationQueries, makeLocalizationQueries } from "./queries";

const customCountryFragment = gql(`
  fragment LocalizationCountryFragment on Country {
    unitSystem
  }
`);

const customLanguageFragment = gql(`
  fragment LocalizationLanguageFragment on Language {
    name
  }
`);

describe("localizationQueries", () => {
  it("queries the localization fields from the PRD contract", () => {
    const query = String(localizationQueries.localization);

    expect(query).toContain("localization {");
    expect(query).toContain("availableCountries {");
    expect(query).toContain("market {");
    expect(query).toContain("@inContext(country: $country, language: $language)");
  });

  it("includes the hydrogen fragments and minimal default consumer fragments", () => {
    const query = String(localizationQueries.localization);

    expect(query).toContain("fragment HydrogenLocalizationCountryFragment on Country");
    expect(query).toContain("fragment HydrogenLocalizationLanguageFragment on Language");
    expect(query).toContain("fragment LocalizationCountryFragment on Country");
    expect(query).toContain("fragment LocalizationLanguageFragment on Language");
  });
});

describe("makeLocalizationQueries", () => {
  it("composes custom country and language fragments", () => {
    const queries = makeLocalizationQueries({
      fragments: { country: customCountryFragment, language: customLanguageFragment },
    });
    const query = String(queries.localization);

    expect(query).toContain("unitSystem");
    expect(query).toContain("fragment LocalizationLanguageFragment on Language");
  });

  it("throws when a country fragment has the wrong name", () => {
    const misnamedFragment = gql(`
      fragment MyCountryFragment on Country {
        isoCode
      }
    `);

    expect(() => makeLocalizationQueries({ fragments: { country: misnamedFragment } })).toThrow(
      /must be named LocalizationCountryFragment/,
    );
  });

  it("throws when a language fragment targets the wrong type", () => {
    const wrongTypeFragment = gql(`
      fragment LocalizationLanguageFragment on Country {
        isoCode
      }
    `);

    expect(() => makeLocalizationQueries({ fragments: { language: wrongTypeFragment } })).toThrow(
      /target Language/,
    );
  });
});
