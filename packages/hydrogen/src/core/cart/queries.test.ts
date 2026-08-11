import { describe, expect, it } from "vitest";

import { gql } from "../../graphql";
import {
  cartMetafieldDeleteMutation,
  cartMetafieldsSetMutation,
  cartQueries,
  makeCartQueries,
} from "./queries";

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

  it("keeps default cart queries off inventory-gated fields", () => {
    for (const query of Object.values(cartQueries)) {
      expect(query).not.toContain("quantityAvailable");
    }
  });

  it("adds custom cart fields to every cart document without removing the minimum payload", () => {
    const customQueries = makeCartQueries({ fragment: customCartFragment });

    for (const query of Object.values(customQueries)) {
      expect(query).toContain("selectedOptions");
      expect(query).toContain("...HydrogenCartFragment");
      expect(query).toContain("...CartFragment");
      expect(query).toContain("fragment CartFragment on Cart");
      expect(query).toContain("attributes");
      expect(query).toContain("availableForSale");
    }
  });

  it("allows custom cart fragments to opt in to inventory fields", () => {
    const inventoryCartFragment = gql(`
      fragment CartFragment on Cart {
        lines(first: 250) {
          nodes {
            merchandise {
              ... on ProductVariant {
                quantityAvailable
              }
            }
          }
        }
      }
    `);
    const customQueries = makeCartQueries({ fragment: inventoryCartFragment });

    for (const query of Object.values(customQueries)) {
      expect(query).toContain("quantityAvailable");
    }
  });

  it("declares Storefront API context on metafield mutations", () => {
    for (const mutation of [cartMetafieldsSetMutation, cartMetafieldDeleteMutation]) {
      expect(mutation).toContain("$country: CountryCode");
      expect(mutation).toContain("$language: LanguageCode");
      expect(mutation).toContain("@inContext(country: $country, language: $language)");
    }
  });

  it("keeps metafield mutations free of cart fragment spreads", () => {
    // cartMetafieldsSet and cartMetafieldDelete responses contain no cart
    // object, so there is no cart selection to spread fragments into.
    for (const mutation of [cartMetafieldsSetMutation, cartMetafieldDeleteMutation]) {
      expect(mutation).toContain("userErrors");
      expect(mutation).not.toContain("...HydrogenCartFragment");
      expect(mutation).not.toContain("...CartFragment");
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
