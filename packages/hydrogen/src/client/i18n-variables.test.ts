import { describe, expect, it } from "vitest";

import { getI18nVariableNames } from "./i18n-variables";

describe("getI18nVariableNames", () => {
  it.each([
    ["$country: CountryCode, $language: String", ["country"]],
    ["$country: CountryCode!, $language: [LanguageCode]", ["country"]],
    ["$country: CountryCode = US, $language: Int", ["country"]],
    ["$country: Boolean, $language: LanguageCode", ["language"]],
    ["$country: LanguageCode, $language: LanguageCode!", ["language"]],
    ["$country: [CountryCode!]!, $language: CountryCode", []],
    ["$country: CountryCodes, $language: ProductSortKeys!", []],
    ["$country: String!, $language: [LanguageCode!]", []],
  ])("injects only exact i18n declarations in (%s)", (declarations, expected) => {
    expect(getI18nVariableNames(`query Q(${declarations}) { shop { name } }`)).toEqual(expected);
  });

  it("skips comments and commas", () => {
    expect(
      getI18nVariableNames(
        `# $language: LanguageCode\nquery Q(,$handle: String!,, $country: # market\n CountryCode!,$language:String,) { shop { name } }`,
      ),
    ).toEqual(["country"]);
  });

  it("does not read declarations inside escaped default strings", () => {
    expect(
      getI18nVariableNames(
        `query Q($handle: String = "\\" $language: LanguageCode = EN", $key: String = """ \\""" $language: LanguageCode = EN """, $country: CountryCode) { shop { name } }`,
      ),
    ).toEqual(["country"]);
  });

  it("skips default values and directives of other declarations", () => {
    expect(
      getI18nVariableNames(
        `query Q($ids: [ID!] = ["a)", "b"], $filter: ProductFilter = {tag: "$language: LanguageCode"} @deprecated(reason: "x)"), $country: CountryCode @deprecated, $language: String) { shop { name } }`,
      ),
    ).toEqual(["country"]);
  });

  it("reads the first operation after fragments and descriptions", () => {
    expect(
      getI18nVariableNames(
        `fragment F on Shop @include(if: true) { name ... on Shop { id } }\n"""$language: LanguageCode"""\nquery ($country: CountryCode) { shop { ...F } }`,
      ),
    ).toEqual(["country"]);
    expect(
      getI18nVariableNames(`mutation M($language: LanguageCode) { cartCreate { cart { id } } }`),
    ).toEqual(["language"]);
  });

  it("ignores declarations of later operations", () => {
    expect(
      getI18nVariableNames(
        `query A($handle: String!) { product(handle: $handle) { id } }\nquery B($country: CountryCode) { shop { name } }`,
      ),
    ).toEqual([]);
    expect(
      getI18nVariableNames(`{ shop { name } }\nquery B($country: CountryCode) { shop { name } }`),
    ).toEqual([]);
  });
});
