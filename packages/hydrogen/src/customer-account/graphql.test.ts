import { describe, expect, it } from "vitest";

import { assertCustomerAccountDocument, gql, isCustomerAccountDocument } from "./graphql";

describe("Customer Account API gql", () => {
  it("deduplicates composed fragments", () => {
    const fragment = gql(`fragment CustomerName on Customer { firstName }`);
    const query = gql(`query CurrentCustomer { customer { ...CustomerName } }`, [
      fragment,
      fragment,
    ]);

    expect(query.source).toBe(
      `query CurrentCustomer { customer { ...CustomerName } }\nfragment CustomerName on Customer { firstName }`,
    );
  });

  it.each([
    ["$language: LanguageCode", ["language"]],
    ["$language: LanguageCode!", ["language"]],
    ["$language: LanguageCode = EN", ["language"]],
    ["$language: String", []],
    ["$language: [LanguageCode!]", []],
    ["$language: CountryCode", []],
    ["$locale: LanguageCode", []],
  ])(
    "records i18n variables declared with their Customer Account type (%s)",
    (declaration, expected) => {
      const query = gql(`query CurrentCustomer(${declaration}) { customer { firstName } }`);

      expect(isCustomerAccountDocument(query)).toBe(true);
      if (!isCustomerAccountDocument(query)) throw new Error("Expected Customer Account document");
      expect([...query.i18nVariableNames]).toEqual(expected);
    },
  );

  it("reads i18n variables from the operation, not from appended fragments", () => {
    const fragment = gql(`fragment CustomerName on Customer { firstName }`);
    const query = gql(
      `query CurrentCustomer($language: LanguageCode) @inContext(language: $language) { customer { ...CustomerName } }`,
      [fragment],
    );

    if (!isCustomerAccountDocument(query)) throw new Error("Expected Customer Account document");
    expect([...query.i18nVariableNames]).toEqual(["language"]);
  });

  it("rejects values not created by CAAPI.gql()", () => {
    expect(() => assertCustomerAccountDocument("query { customer { firstName } }")).toThrow(
      "CAAPI.gql()",
    );
  });
});
