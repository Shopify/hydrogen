import { describe, it, expectTypeOf } from "vitest";
import type { ResultOf, VariablesOf } from "gql.tada";

import type { StorefrontGraphqlResult } from "../../client";
import { gql } from "../../graphql";
import type { CartDataForOptions, cartQueries } from "./queries";
import { makeCartQueries } from "./queries";

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
const customCartQueries = makeCartQueries({ fragment: customCartFragment });

type CartWithCustomFields = {
  attributes: unknown;
  lines: { nodes: Array<{ merchandise?: unknown }> };
};

type CartProductVariantMerchandise<TCart extends CartWithCustomFields | null> = NonNullable<
  NonNullable<TCart>["lines"]["nodes"][number]["merchandise"]
>;

describe("cart query result types", () => {
  it("cart query returns a cart with id", () => {
    type R = ResultOf<typeof cartQueries.cart>;
    expectTypeOf<R>().toHaveProperty("cart");
  });

  it("custom cart fragments extend cart query types", () => {
    type R = ResultOf<typeof customCartQueries.cart>;
    type Merchandise = CartProductVariantMerchandise<R["cart"]>;

    expectTypeOf<Merchandise>().not.toBeAny();
    expectTypeOf<NonNullable<R["cart"]>>().toHaveProperty("attributes");
    expectTypeOf<Merchandise>().toHaveProperty("quantityAvailable");
    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("resolves cart data from handler options", () => {
    type Cart = CartDataForOptions<{ readonly fragment: typeof customCartFragment }>;
    type Merchandise = CartProductVariantMerchandise<Cart>;

    expectTypeOf<Cart>().toHaveProperty("attributes");
    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("custom cart fragments extend mutation cart types", () => {
    type R = ResultOf<typeof customCartQueries.cartLinesAdd>;
    type Cart = NonNullable<NonNullable<R["cartLinesAdd"]>["cart"]>;
    type Merchandise = CartProductVariantMerchandise<Cart>;

    expectTypeOf<Merchandise>().not.toBeAny();
    expectTypeOf<Cart>().toHaveProperty("attributes");
    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("cartCreate returns cartCreate with cart and userErrors", () => {
    type R = ResultOf<typeof cartQueries.cartCreate>;
    expectTypeOf<R>().toHaveProperty("cartCreate");
  });

  it("cartLinesAdd returns cartLinesAdd with cart and userErrors", () => {
    type R = ResultOf<typeof cartQueries.cartLinesAdd>;
    expectTypeOf<R>().toHaveProperty("cartLinesAdd");
  });

  it("cartLinesUpdate returns cartLinesUpdate with cart and userErrors", () => {
    type R = ResultOf<typeof cartQueries.cartLinesUpdate>;
    expectTypeOf<R>().toHaveProperty("cartLinesUpdate");
  });

  it("cartLinesRemove returns cartLinesRemove with cart and userErrors", () => {
    type R = ResultOf<typeof cartQueries.cartLinesRemove>;
    expectTypeOf<R>().toHaveProperty("cartLinesRemove");
  });

  it("cartDiscountCodesUpdate returns cartDiscountCodesUpdate", () => {
    type R = ResultOf<typeof cartQueries.cartDiscountCodesUpdate>;
    expectTypeOf<R>().toHaveProperty("cartDiscountCodesUpdate");
  });

  it("cartNoteUpdate returns cartNoteUpdate", () => {
    type R = ResultOf<typeof cartQueries.cartNoteUpdate>;
    expectTypeOf<R>().toHaveProperty("cartNoteUpdate");
  });
});

describe("cart query variable types", () => {
  it("cart query requires id: string", () => {
    type V = VariablesOf<typeof cartQueries.cart>;
    expectTypeOf<V>().toHaveProperty("id");
    expectTypeOf<V["id"]>().toBeString();
  });

  it("cartCreate requires input object", () => {
    type V = VariablesOf<typeof cartQueries.cartCreate>;
    expectTypeOf<V>().toHaveProperty("input");
  });

  it("cartLinesAdd requires cartId and lines", () => {
    type V = VariablesOf<typeof cartQueries.cartLinesAdd>;
    expectTypeOf<V>().toHaveProperty("cartId");
    expectTypeOf<V>().toHaveProperty("lines");
    expectTypeOf<V["cartId"]>().toBeString();
  });

  it("cartLinesUpdate requires cartId and lines", () => {
    type V = VariablesOf<typeof cartQueries.cartLinesUpdate>;
    expectTypeOf<V>().toHaveProperty("cartId");
    expectTypeOf<V>().toHaveProperty("lines");
    expectTypeOf<V["cartId"]>().toBeString();
  });

  it("cartLinesRemove requires cartId and lineIds", () => {
    type V = VariablesOf<typeof cartQueries.cartLinesRemove>;
    expectTypeOf<V>().toHaveProperty("cartId");
    expectTypeOf<V>().toHaveProperty("lineIds");
  });

  it("cartDiscountCodesUpdate requires cartId and discountCodes", () => {
    type V = VariablesOf<typeof cartQueries.cartDiscountCodesUpdate>;
    expectTypeOf<V>().toHaveProperty("cartId");
    expectTypeOf<V>().toHaveProperty("discountCodes");
  });

  it("cartNoteUpdate requires cartId and note", () => {
    type V = VariablesOf<typeof cartQueries.cartNoteUpdate>;
    expectTypeOf<V>().toHaveProperty("cartId");
    expectTypeOf<V>().toHaveProperty("note");
  });
});

describe("storefront client result type inference", () => {
  it("infers typed result for branded queries", () => {
    expectTypeOf<StorefrontGraphqlResult<typeof cartQueries.cart>>().toHaveProperty("data");
    expectTypeOf<StorefrontGraphqlResult<typeof cartQueries.cart>>()
      .toHaveProperty("headers")
      .toEqualTypeOf<Headers>();
  });

  it("StorefrontGraphqlResult wraps data with the inferred type", () => {
    type R = StorefrontGraphqlResult<typeof cartQueries.cartCreate>;
    expectTypeOf({} as NonNullable<R["data"]>).toHaveProperty("cartCreate");
  });
});
