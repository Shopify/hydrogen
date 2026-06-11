import { describe, expect, it } from "vitest";

import { gql } from "../../graphql";
import { cartQueries, makeCartQueries } from "./queries";

const customCartFragment = gql(`
  fragment CartFragment on Cart {
    attributes {
      key
      value
    }
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            availableForSale
          }
        }
      }
    }
  }
`);

describe("cartQueries", () => {
  it("declares Storefront API context on every cart document", () => {
    for (const query of Object.values(cartQueries)) {
      expect(query).toContain("$country: CountryCode");
      expect(query).toContain("$language: LanguageCode");
      expect(query).toContain("@inContext(country: $country, language: $language)");
    }
  });

  it("keeps default cart queries free of custom product variant fields", () => {
    for (const query of Object.values(cartQueries)) {
      expect(query).toContain("...HydrogenCartFragment");
      expect(query).not.toContain("fragment CartFragment on Cart");
      expect(query).not.toContain("availableForSale");
    }
  });

  it("adds custom cart fields to every cart document without removing the minimum payload", () => {
    const customQueries = makeCartQueries({ fragment: customCartFragment });

    for (const query of Object.values(customQueries)) {
      expect(query).toContain("quantityAvailable");
      expect(query).toContain("selectedOptions");
      expect(query).toContain("...HydrogenCartFragment");
      expect(query).toContain("...CartFragment");
      expect(query).toContain("fragment CartFragment on Cart");
      expect(query).toContain("attributes");
      expect(query).toContain("availableForSale");
    }
  });

  it("throws locally when cart fragments use the wrong name", () => {
    const wrongFragment = gql(`
      fragment WrongCartFragment on Cart {
        attributes {
          key
        }
      }
    `);

    expect(() => makeCartQueries({ fragment: wrongFragment })).toThrow(
      "Cart fragment must be named CartFragment",
    );
  });
});
