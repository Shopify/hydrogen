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

  it("exposes declared variable names", () => {
    const query = gql(
      `query CurrentCustomer($language: LanguageCode) @inContext(language: $language) { customer { firstName } }`,
    );

    expect(isCustomerAccountDocument(query)).toBe(true);
    if (!isCustomerAccountDocument(query)) throw new Error("Expected Customer Account document");
    expect([...query.variableNames]).toEqual(["language"]);
  });

  it("rejects values not created by CAAPI.gql()", () => {
    expect(() => assertCustomerAccountDocument("query { customer { firstName } }")).toThrow(
      "CAAPI.gql()",
    );
  });
});
