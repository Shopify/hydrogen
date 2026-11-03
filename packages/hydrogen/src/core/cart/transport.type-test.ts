import { describe, expectTypeOf, it } from "vitest";

import type { CartTransport, CartTransportUpdate, CartStore } from "./cart";
import type { CartData } from "./state";

function summarize(update: CartTransportUpdate): string {
  if ("lines" in update) {
    const [line] = update.lines;
    return line && "id" in line ? line.id : (line?.merchandiseId ?? "");
  }
  if ("discountCodes" in update) return update.discountCodes.join();
  if ("note" in update) return update.note;
  return update.attributes.map(({ key }) => key).join();
}

describe("CartTransport", () => {
  it("names the cart in every change and narrows to one kind of change", () => {
    expectTypeOf<CartTransportUpdate["cartId"]>().toEqualTypeOf<string | null>();
    expectTypeOf(summarize).returns.toEqualTypeOf<string>();
  });

  it("requires a cart ID on returned carts", () => {
    const cart = null as unknown as CartData;
    const transport: CartTransport = {
      // @ts-expect-error A loaded cart must have an ID.
      getCart: async () => ({ cart }),
      // @ts-expect-error A changed cart must have an ID.
      updateCart: async () => ({ cart }),
    };
    void transport;
  });

  it("types returned carts from custom cart data", () => {
    type Custom = CartData & { groups: string[] };
    type Loaded = Awaited<ReturnType<CartTransport<Custom>["getCart"]>>["cart"];

    expectTypeOf<NonNullable<Loaded>["groups"]>().toEqualTypeOf<string[]>();
  });

  it("gives every cart change method a promise of void", () => {
    expectTypeOf<ReturnType<CartStore["updateLines"]>>().toEqualTypeOf<Promise<void>>();
    expectTypeOf<ReturnType<CartStore["addLines"]>>().toEqualTypeOf<Promise<void>>();
  });
});
