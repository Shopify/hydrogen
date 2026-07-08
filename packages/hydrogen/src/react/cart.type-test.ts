import { describe, expectTypeOf, it } from "vitest";

import { createCartServerHandlers } from "../core/cart";
import type { CartData, CartState } from "../core/cart/state";
import { gql } from "../graphql";
import { createCartComponents } from "./cart";

type CustomCartData = CartData & {
  loyaltyPoints: number;
  pending: "merchant-pending";
  errors: "merchant-errors";
  loading: "merchant-loading";
};

type CustomCartState = CartState<CustomCartData>;
const customCart = createCartComponents<{
  get: () => Promise<{ data: { cart: CustomCartData } }>;
}>();
type Selector = Parameters<typeof customCart.useCart<number>>[0];

const selector: Selector = (cart) => cart.data.loyaltyPoints;

describe("cart state types", () => {
  it("nests custom cart data under state.data", () => {
    expectTypeOf<CustomCartState["data"]["loyaltyPoints"]>().toEqualTypeOf<number>();
    expectTypeOf<CustomCartState["data"]["pending"]>().toEqualTypeOf<"merchant-pending">();
    expectTypeOf<CustomCartState["data"]["errors"]>().toEqualTypeOf<"merchant-errors">();
    expectTypeOf<CustomCartState["data"]["loading"]>().toEqualTypeOf<"merchant-loading">();
    expectTypeOf<CustomCartState["pending"]["lines"]>().toEqualTypeOf<Set<string>>();
    expectTypeOf<CustomCartState["errors"]["network"]>().toEqualTypeOf<
      Array<{ message: string; status?: number }>
    >();
    expectTypeOf<ReturnType<typeof selector>>().toEqualTypeOf<number>();
  });
});

const cartFragment = gql(`
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
const cartHandlers = createCartServerHandlers({ fragment: cartFragment });
const typedCart = createCartComponents<typeof cartHandlers>();

describe("createCartComponents", () => {
  it("carries the custom cart query type on server handlers", () => {
    type HandlerResult = Awaited<ReturnType<typeof cartHandlers.get>>;
    type HandlerData = NonNullable<HandlerResult["data"]["cart"]>;

    type Merchandise = NonNullable<HandlerData["lines"]["nodes"][number]["merchandise"]>;

    expectTypeOf<HandlerData>().toHaveProperty("attributes");
    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("types cart state from custom cart server handlers", () => {
    function Consumer() {
      const availableForSale = typedCart.useCart(
        (state) => state.data.lines.nodes[0]?.merchandise?.availableForSale ?? false,
      );

      expectTypeOf(availableForSale).toEqualTypeOf<boolean>();
    }

    void Consumer;
  });

  it("keeps custom merchandise fields when mapping selected cart lines", () => {
    function Consumer() {
      const availability = typedCart.useCart((state) =>
        state.data.lines.nodes.map((line) => line.merchandise?.availableForSale),
      );

      expectTypeOf<(typeof availability)[number]>().toMatchTypeOf<boolean | undefined>();
    }

    void Consumer;
  });

  it("types CartProvider initialData from custom cart server handlers", () => {
    type Props = Parameters<typeof typedCart.CartProvider>[0];
    type InitialData = NonNullable<Awaited<NonNullable<Props["initialData"]>>>;
    type InitialCart = NonNullable<InitialData["cart"]>;
    type Merchandise = NonNullable<InitialCart["lines"]["nodes"][number]["merchandise"]>;

    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("keeps cart form helpers available on typed components", () => {
    expectTypeOf(typedCart.useCartForm).toBeFunction();
  });
});
