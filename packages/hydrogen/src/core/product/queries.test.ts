import { describe, expect, it } from "vitest";

import { gql } from "../../graphql";
import { makeProductQueries, productQueries } from "./queries";

const customProductFragment = gql(`
  fragment ProductFragment on Product {
    description
  }
`);

describe("productQueries", () => {
  it("declares Storefront API context on every product document", () => {
    for (const query of Object.values(productQueries)) {
      expect(query).toContain("$country: CountryCode");
      expect(query).toContain("$language: LanguageCode");
      expect(query).toContain("@inContext(country: $country, language: $language)");
    }
  });

  it("adds custom product fields without removing the minimum payload", () => {
    const customQueries = makeProductQueries({ fragment: customProductFragment });

    expect(customQueries.product).toContain("...HydrogenProductFragment");
    expect(customQueries.product).toContain("...ProductFragment");
    expect(customQueries.product).toContain("fragment ProductFragment on Product");
    expect(customQueries.product).toContain("description");
  });

  it("throws locally when product fragments target ProductVariant", () => {
    const productVariantFragment = gql(`
      fragment ProductFragment on ProductVariant {
        id
      }
    `);

    expect(() => makeProductQueries({ fragment: productVariantFragment })).toThrow(
      "Product fragment must be named ProductFragment and target Product",
    );
  });
});
