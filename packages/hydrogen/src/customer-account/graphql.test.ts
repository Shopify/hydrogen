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

  it("appends a sub-fragment once when two composed fragments both spread it", () => {
    const money = gql(`fragment Money on MoneyV2 { amount currencyCode }`);
    const lineItem = gql(`fragment LineItem on LineItem { title price { ...Money } }`, [money]);
    const order = gql(`fragment OrderFields on Order { id totalPrice { ...Money } }`, [money]);
    const query = gql(
      `query Orders { customer { orders(first: 1) { nodes { ...OrderFields lineItems(first: 1) { nodes { ...LineItem } } } } } }`,
      [lineItem, order],
    );

    expect(query.source.split("fragment Money on MoneyV2").length - 1).toBe(1);
    expect(query.source.split("fragment LineItem on LineItem").length - 1).toBe(1);
    expect(query.source.split("fragment OrderFields on Order").length - 1).toBe(1);
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
