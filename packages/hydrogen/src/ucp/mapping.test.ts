import { describe, expect, it } from "vitest";

import failure from "./__fixtures__/aggregate-child-failure.json";
import empty from "./__fixtures__/aggregate-empty.json";
import mixed from "./__fixtures__/aggregate-mixed-currency-read.json";
import read from "./__fixtures__/aggregate-read.json";
import single from "./__fixtures__/aggregate-single-session.json";
import { ucpCartToCartData, minorToMoney, cartPayloadToUcpUpdate } from "./mapping";
import type { UcpCart } from "./types";
describe("UCP mapping", () => {
  it.each([read, mixed, single, failure, empty])("maps fixture", (fixture) => {
    const source = fixture.response as UcpCart;
    const cart = ucpCartToCartData(source);
    const children = source.carts?.filter((c) => c.currency && c.line_items && c.totals);
    expect(cart.groups).toHaveLength(children?.length ?? 1);
    expect(cart.totalQuantity).toBe(source.line_items.reduce((n, l) => n + l.quantity, 0));
    expect(cart.cost === undefined).toBe(new Set(children?.map((c) => c.currency)).size !== 1);
  });
  it.each([
    [1200, "USD", "12.00"],
    [500, "JPY", "500"],
    [1234, "KWD", "1.234"],
    [-1, "KWD", "-0.001"],
  ] as const)("converts minor units", (value, currency, amount) =>
    expect(minorToMoney(value, currency)).toEqual({ amount, currencyCode: currency }),
  );
  it("maps item images", () => {
    const child = {
      id: "c",
      shop: "a.example",
      currency: "USD",
      totals: [{ type: "total", amount: 1200 }],
      line_items: [
        {
          id: "l",
          quantity: 1,
          totals: [{ type: "total", amount: 1200 }],
          item: { id: "v", title: "Mug", price: 1200, image_url: "https://cdn.example/mug.png" },
        },
        {
          id: "m",
          quantity: 1,
          totals: [{ type: "total", amount: 500 }],
          item: { id: "w", title: "Cap", price: 500 },
        },
      ],
    };
    const cart = ucpCartToCartData({
      id: "x",
      line_items: [],
      carts: [child],
    } as unknown as UcpCart);
    expect(cart.lines.nodes.map((l) => l.merchandise?.image)).toEqual([
      { url: "https://cdn.example/mug.png", altText: "Mug" },
      null,
    ]);
  });
  it("replaces quantities, removes and adds", () => {
    const child = read.response.carts[0];
    expect(child).toBeDefined();
    const result = cartPayloadToUcpUpdate(child, {
      lines: [
        { id: child?.line_items[0]?.id, quantity: 0 },
        { merchandiseId: "new", quantity: 2 },
      ],
      discountCodes: ["SAVE"],
    });
    expect(result.line_items).toEqual([{ item: { id: "new" }, quantity: 2 }]);
    expect(result.discounts).toEqual({ codes: ["SAVE"] });
  });
});
