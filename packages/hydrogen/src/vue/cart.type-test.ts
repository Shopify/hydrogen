import type { ShallowRef } from "vue";
import { describe, expectTypeOf, it } from "vitest";

import type { CartActions as CoreCartActions } from "../core";
import { createCartServerHandlers } from "../core/cart";
import { gql } from "../graphql";
import { createCartComponents } from "./cart";
import type { CartActions } from "./index";

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
  it("types cart state from custom cart server handlers", () => {
    function Consumer() {
      const availableForSale = typedCart.useCart(
        (state) => state.data.lines.nodes[0]?.merchandise?.availableForSale ?? false,
      );

      expectTypeOf(availableForSale).toEqualTypeOf<Readonly<ShallowRef<boolean>>>();
      expectTypeOf(availableForSale.value).toEqualTypeOf<boolean>();
    }

    void Consumer;
  });

  it("types CartProvider initialData from custom cart server handlers", () => {
    type Props = InstanceType<typeof typedCart.CartProvider>["$props"];
    type InitialData = NonNullable<Awaited<NonNullable<Props["initialData"]>>>;
    type InitialCart = NonNullable<InitialData["cart"]>;
    type Merchandise = NonNullable<InitialCart["lines"]["nodes"][number]["merchandise"]>;

    expectTypeOf<InitialCart>().toHaveProperty("attributes");
    expectTypeOf<Merchandise>().toHaveProperty("availableForSale");
  });

  it("keeps cart actions available on typed components", () => {
    expectTypeOf(typedCart.useCartActions).toBeFunction();
    expectTypeOf<ReturnType<typeof typedCart.useCartActions>["refresh"]>().toEqualTypeOf<
      () => void
    >();
  });

  it("re-exports the core CartActions type", () => {
    expectTypeOf<CartActions>().toEqualTypeOf<CoreCartActions>();
  });

  it("passes a SubmitEvent to useCartForm formProps callbacks", () => {
    type FormPropsOptions = NonNullable<
      Parameters<ReturnType<typeof typedCart.useCartForm>["formProps"]>[0]
    >;

    expectTypeOf<Parameters<NonNullable<FormPropsOptions["beforeSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();
    expectTypeOf<Parameters<NonNullable<FormPropsOptions["afterSubmit"]>>[0]>().toEqualTypeOf<
      SubmitEvent
    >();

    function Consumer() {
      const { formProps } = typedCart.useCartForm();
      formProps({
        beforeSubmit: (e) => {
          expectTypeOf(e.submitter).toEqualTypeOf<HTMLElement | null>();
        },
      });
      formProps({
        beforeSubmit: (e: Event) => e.preventDefault(),
        afterSubmit: (e: Event) => e.preventDefault(),
      });
    }

    void Consumer;
  });
});
